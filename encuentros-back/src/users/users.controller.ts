import { Controller, Post, Body, BadRequestException, Get, Query, HttpException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users') // Agrupa estos endpoints bajo "users" en Swagger
@Controller('users')
@UseGuards(JwtAuthGuard) // Protege todos los endpoints de usuarios
export class UsersController {
  constructor(private readonly usersService: UsersService, private dataSource: DataSource) {}

  @Get('search_user')
  async searchUser(@Query('q') q: string, @Query('currentUser') currentUser?: string) {
    try {
      const results = await this.usersService.searchByName(q || '');

      // if currentUser provided, annotate each user with friendship/pending info
      if (currentUser) {
        const cur = Number(currentUser);
        const annotated = [] as any[];
        for (const u of results) {
          const otherId = (u as any).id ?? (u as any).ID_USUARIO ?? (u as any).ID_USUARIO;

          // check friendship existence in AMISTADES
          let isFriend = false;
          try {
            const friendSql = `
              SELECT COUNT(*) as CNT FROM AMISTADES a
              WHERE (a.USUARIO1 = :1 AND a.USUARIO2 = :2) OR (a.USUARIO1 = :3 AND a.USUARIO2 = :4)
            `;
            const friendRes = await this.dataSource.query(friendSql, [cur, Number(otherId), Number(otherId), cur]);
            isFriend = friendRes && friendRes[0] && Number(friendRes[0].CNT ?? friendRes[0].COUNT ?? 0) > 0;
          } catch (e) {
            // If AMISTADES doesn't exist or query fails, fallback to false and log for debugging
            console.warn('Could not check AMISTADES table for friendship status', e && e.message ? e.message : e);
            isFriend = false;
          }

          // check pending request sent by current user to other
          const pendingFromSql = `
            SELECT COUNT(*) as CNT FROM RELACIONES_AMISTADES ra
            JOIN SOLICITUDES_AMISTAD sa ON sa.ID_RELACION_AMISTAD = ra.ID_RELACION_AMISTAD
            WHERE ra.ID_USUARIO = :1 AND sa.USUARIO_DESTINO = :2 AND ra.ESTADO = 'pendiente'
          `;
          let pendingRequestFromMe = false;
          try {
            const pendingFromRes = await this.dataSource.query(pendingFromSql, [cur, Number(otherId)]);
            pendingRequestFromMe = pendingFromRes && pendingFromRes[0] && Number(pendingFromRes[0].CNT ?? pendingFromRes[0].COUNT ?? 0) > 0;
          } catch (e) {
            console.warn('Could not check pending requests (from) for search annotation', e && e.message ? e.message : e);
            pendingRequestFromMe = false;
          }

          // check pending request sent by other to current user
          const pendingToSql = `
            SELECT COUNT(*) as CNT FROM RELACIONES_AMISTADES ra
            JOIN SOLICITUDES_AMISTAD sa ON sa.ID_RELACION_AMISTAD = ra.ID_RELACION_AMISTAD
            WHERE ra.ID_USUARIO = :1 AND sa.USUARIO_DESTINO = :2 AND ra.ESTADO = 'pendiente'
          `;
          let pendingRequestToMe = false;
          try {
            const pendingToRes = await this.dataSource.query(pendingToSql, [Number(otherId), cur]);
            pendingRequestToMe = pendingToRes && pendingToRes[0] && Number(pendingToRes[0].CNT ?? pendingToRes[0].COUNT ?? 0) > 0;
          } catch (e) {
            console.warn('Could not check pending requests (to) for search annotation', e && e.message ? e.message : e);
            pendingRequestToMe = false;
          }

          annotated.push({ ...u, isFriend, pendingRequestFromMe, pendingRequestToMe });
        }
        return { success: true, results: annotated };
      }

      return { success: true, results };
    } catch (error) {
      console.error('Error en search_user', error);
      throw new HttpException('Error buscando usuarios', 500);
    }
  }

  @Post('friend-request')
  async createFriendRequest(@Body() body: { from: number; to: number }) {
    const { from, to } = body;
    if (!from || !to) {
      throw new BadRequestException('Se requieren campos from y to');
    }

    try {
      // Antes de crear la solicitud, verificar si ya existen como amigos
      try {
        const friendCheckSql = `
          SELECT COUNT(*) as CNT FROM AMISTADES a
          WHERE (a.USUARIO1 = :1 AND a.USUARIO2 = :2) OR (a.USUARIO1 = :3 AND a.USUARIO2 = :4)
        `;
        const friendCheck = await this.dataSource.query(friendCheckSql, [from, to, to, from]);
        const isFriend = friendCheck && friendCheck[0] && Number(friendCheck[0].CNT ?? friendCheck[0].COUNT ?? 0) > 0;
        if (isFriend) {
          throw new HttpException('Ya son amigos', 400);
        }
      } catch (e) {
        // Si la tabla AMISTADES no existe o falla la consulta, no bloquear la creación
        // pero se registra la advertencia para debugging
        if (e instanceof HttpException) throw e;
        console.warn('AMISTADES check failed; continuing to create request if allowed', e && e.message ? e.message : e);
      }

      // Llamada al procedimiento PL/SQL (bloque anónimo)
      // Antes de crear, verificar si existe una solicitud pendiente en sentido inverso (to -> from).
      try {
        const reverseSql = `
          SELECT ra.ID_RELACION_AMISTAD as id_relacion
          FROM RELACIONES_AMISTADES ra
          JOIN SOLICITUDES_AMISTAD sa ON sa.ID_RELACION_AMISTAD = ra.ID_RELACION_AMISTAD
          WHERE ra.ID_USUARIO = :1 AND sa.USUARIO_DESTINO = :2 AND ra.ESTADO = 'pendiente'
        `;
        const reverseRows = await this.dataSource.query(reverseSql, [to, from]);
        if (reverseRows && reverseRows[0]) {
          // Hay una solicitud inversa pendiente: aceptar esa solicitud automáticamente para evitar duplicados
          const reverseId = reverseRows[0].ID_RELACION ?? reverseRows[0].id_relacion ?? reverseRows[0].ID_RELACION_AMISTAD;
          const acceptSql = `BEGIN aceptar_solicitud_amistad(:1, :2); END;`;
          // quien acepta es el destinatario original de la solicitud inversa (que ahora es 'from')
          await this.dataSource.query(acceptSql, [Number(reverseId), from]);
          return { success: true, message: 'Solicitud cruzada detectada: amistad aceptada automáticamente' };
        }
      } catch (e) {
        console.warn('Reverse pending check failed; proceeding to create request', e && e.message ? e.message : e);
      }

      const sql = `BEGIN crear_solicitud_amistad(:1, :2); END;`;
      // Usar DataSource inyectado (TypeOrmModule.forRoot) para ejecutar la query
      await this.dataSource.query(sql, [from, to]);
      return { success: true, message: 'Solicitud enviada' };
    } catch (err: any) {
      console.error('Error creando solicitud de amistad', err);
      const msg = (err && (err.message || err.error || JSON.stringify(err))) || 'Error desconocido';
      if (msg.includes('-20002')) {
        throw new HttpException('El usuario al que le va a enviar una solicitud ya le ha enviado una a usted.', 400);
      }
      if (msg.includes('-20003')) {
        throw new HttpException('Ya le ha enviado una solicitud de amistad a este usuario.', 400);
      }
      if (msg.includes('-20001')) {
        throw new HttpException('Error al crear la solicitud de amistad.', 500);
      }
      throw new HttpException(msg, 500);
    }
  }

  @Get('notifications')
  async getNotifications(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId es requerido');
    try {
      // Obtener solicitudes pendientes donde el destinatario es userId
      // Notar: la tabla de usuarios en la BD se llama USUARIOS (ver User entity), no USERS.
      const sql = `
        SELECT ra.ID_RELACION_AMISTAD as id_relacion,
               ra.ID_USUARIO as usuario_origen,
               u.NOMBRE as nombre_origen,
               u.APELLIDO as apellido_origen,
               ra.FECHA_SOLICITUD_AMISTAD as fecha_solicitud
        FROM RELACIONES_AMISTADES ra
        JOIN SOLICITUDES_AMISTAD sa ON sa.ID_RELACION_AMISTAD = ra.ID_RELACION_AMISTAD
        JOIN USUARIOS u ON u.ID_USUARIO = ra.ID_USUARIO
        WHERE sa.USUARIO_DESTINO = :1
          AND ra.ESTADO = 'pendiente'
        ORDER BY ra.FECHA_SOLICITUD_AMISTAD DESC
      `;
      const rows = await this.dataSource.query(sql, [Number(userId)]);

      // Además, obtener notificaciones de aceptación: amistades creadas donde el usuario fue el origen
      const acceptedSql = `
        SELECT a.ID_RELACION_AMISTAD as id_relacion,
               a.USUARIO1 as usuario_origen,
               u2.NOMBRE as nombre_origen,
               u2.APELLIDO as apellido_origen,
               a.FECHA_AMISTAD as fecha_amistad
        FROM AMISTADES a
        JOIN USUARIOS u2 ON u2.ID_USUARIO = a.USUARIO2
        WHERE a.USUARIO1 = :1
        ORDER BY a.FECHA_AMISTAD DESC
      `;
      const accepted = await this.dataSource.query(acceptedSql, [Number(userId)]);

      return { success: true, pending: rows, accepted };
    } catch (err) {
      console.error('Error obteniendo notificaciones', err);
      throw new HttpException('Error obteniendo notificaciones', 500);
    }
  }

  @Post('accept-request')
  async acceptRequest(@Body() body: { id_relacion_amistad: number; userId: number }) {
    const { id_relacion_amistad, userId } = body;
    if (!id_relacion_amistad || !userId) throw new BadRequestException('id_relacion_amistad y userId son requeridos');
    try {
      // Antes de llamar al procedimiento, obtener los usuarios implicados
      const relSql = `
        SELECT ra.ID_USUARIO as usuario_origen
        FROM RELACIONES_AMISTADES ra
        WHERE ra.ID_RELACION_AMISTAD = :1
      `;
      const relRows = await this.dataSource.query(relSql, [id_relacion_amistad]);
      if (!relRows || !relRows[0]) {
        throw new HttpException('No se encontró la relación de amistad', 404);
      }
      const usuario_origen = Number(relRows[0].USUARIO_ORIGEN ?? relRows[0].usuario_origen ?? relRows[0].ID_USUARIO ?? relRows[0].ID_USUARIO);

      const destSql = `SELECT sa.USUARIO_DESTINO as usuario_destino FROM SOLICITUDES_AMISTAD sa WHERE sa.ID_RELACION_AMISTAD = :1`;
      const destRows = await this.dataSource.query(destSql, [id_relacion_amistad]);
      if (!destRows || !destRows[0]) {
        throw new HttpException('No se encontró la solicitud de amistad asociada', 404);
      }
      const usuario_destino = Number(destRows[0].USUARIO_DESTINO ?? destRows[0].usuario_destino ?? destRows[0].USUARIO_DESTINO);

      // Verificar si ya existe amistad entre ambos (para evitar duplicados)
      try {
        const friendCheckSql = `
          SELECT COUNT(*) as CNT FROM AMISTADES a
          WHERE (a.USUARIO1 = :1 AND a.USUARIO2 = :2) OR (a.USUARIO1 = :3 AND a.USUARIO2 = :4)
        `;
        const friendCheck = await this.dataSource.query(friendCheckSql, [usuario_origen, usuario_destino, usuario_destino, usuario_origen]);
        const alreadyFriend = friendCheck && friendCheck[0] && Number(friendCheck[0].CNT ?? friendCheck[0].COUNT ?? 0) > 0;
        if (alreadyFriend) {
          // marcar la relación como aceptada (si no lo está) para mantener consistencia
          const updateSql = `UPDATE RELACIONES_AMISTADES SET ESTADO = 'aceptada', FECHA_ACEPTACION_AMISTAD = SYSDATE WHERE ID_RELACION_AMISTAD = :1`;
          await this.dataSource.query(updateSql, [id_relacion_amistad]);
          return { success: true, message: 'Ya son amigos' };
        }
      } catch (e) {
        console.warn('AMISTADES check failed during accept; proceeding to call procedure', e && e.message ? e.message : e);
      }

      const sql = `BEGIN aceptar_solicitud_amistad(:1, :2); END;`;
      await this.dataSource.query(sql, [id_relacion_amistad, userId]);
      return { success: true, message: 'Solicitud aceptada' };
    } catch (err: any) {
      console.error('Error aceptando solicitud', err);
      const msg = (err && (err.message || err.error || JSON.stringify(err))) || 'Error desconocido';
      if (msg.includes('-20002')) {
        throw new HttpException('La solicitud de amistad ya está aceptada.', 400);
      }
      if (msg.includes('-20003')) {
        throw new HttpException('El usuario que intenta aceptar no es el destinatario de la solicitud de amistad.', 400);
      }
      if (msg.includes('-20001')) {
        throw new HttpException('No se encontró la solicitud o la relación de amistad.', 404);
      }
      throw new HttpException(msg, 500);
    }
  }

  @Post('reject-request')
  async rejectRequest(@Body() body: { id_relacion_amistad: number; userId: number }) {
    const { id_relacion_amistad, userId } = body;
    if (!id_relacion_amistad || !userId) throw new BadRequestException('id_relacion_amistad y userId son requeridos');
    try {
      // Verificar que la solicitud existe y obtener el destinatario
      const solSql = `SELECT sa.USUARIO_DESTINO as usuario_destino FROM SOLICITUDES_AMISTAD sa WHERE sa.ID_RELACION_AMISTAD = :1`;
      const solRows = await this.dataSource.query(solSql, [id_relacion_amistad]);
      if (!solRows || !solRows[0]) {
        throw new HttpException('No se encontró la solicitud de amistad asociada', 404);
      }
      const usuario_destino = Number(solRows[0].USUARIO_DESTINO ?? solRows[0].usuario_destino ?? solRows[0].USUARIO_DESTINO);

      // Solo el destinatario puede rechazar
      if (usuario_destino !== Number(userId)) {
        throw new HttpException('Solo el destinatario puede rechazar la solicitud', 403);
      }

      // Eliminar la solicitud y la relación asociada
      const delSolSql = `DELETE FROM SOLICITUDES_AMISTAD WHERE ID_RELACION_AMISTAD = :1`;
      await this.dataSource.query(delSolSql, [id_relacion_amistad]);

      const delRelSql = `DELETE FROM RELACIONES_AMISTADES WHERE ID_RELACION_AMISTAD = :1`;
      await this.dataSource.query(delRelSql, [id_relacion_amistad]);

      return { success: true, message: 'Solicitud rechazada y eliminada' };
    } catch (err: any) {
      console.error('Error rechazando solicitud', err);
      const msg = (err && (err.message || err.error || JSON.stringify(err))) || 'Error desconocido';
      if (msg.includes('-20001')) {
        throw new HttpException('No se encontró la solicitud o la relación de amistad.', 404);
      }
      throw new HttpException(msg, 500);
    }
  }

  @Post()
  async create(@Body() userData: CreateUserDto): Promise<User> {
    console.log('Received user data:', userData);

    // Evita crear usuarios con el mismo email
    const existing = await this.usersService.findByEmail(userData.email);
    if (existing) {
      throw new BadRequestException('El correo ya está registrado, intenta con otro');
    }

    return this.usersService.create(userData);
  }

  @Post('login')
  async login(@Body() body: { email: string; contrasena: string }) {
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }
    if (user.contrasena !== body.contrasena) {
      return { success: false, message: 'Usuario o contraseña incorrectos' };
    }
    return { success: true, user };
  }

  @Get('userData')
  async getUserData(@Body() body: { email: string }) {
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }
    return { success: true, user };
  }

  @Post('update')
  async updateUser(@Body() body: { email: string; updateData: Partial<User> }) {
    try {
      const updatedUser = await this.usersService.updateUser(body.email, body.updateData);
      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('updatePassword')
  async updatePassword(@Body() body: { email: string; currentPassword: string; newPassword: string }) {
    try {
      const updatedUser = await this.usersService.updatePassword(body.email, body.currentPassword, body.newPassword);
      // No devolver la contraseña en la respuesta
      const safeUser = { ...updatedUser } as any;
      if (safeUser.contrasena) delete safeUser.contrasena;
      return { success: true, user: safeUser };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('delete')
  async deleteUser(@Body() body: { email: string }) {
    try {
      await this.usersService.deleteUser(body.email);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('friends/:userId')
  async getFriends(@Query('userId') userId: string) {
    try {
      const userIdNum = Number(userId);
      if (isNaN(userIdNum)) {
        throw new BadRequestException('userId debe ser un número válido');
      }

      // Consultar la tabla AMISTADES para obtener los amigos del usuario
      // Simplificamos la consulta usando UNION para evitar problemas con CASE
      const friendsSql = `
        SELECT DISTINCT
          u.ID_USUARIO as id,
          u.NOMBRE as nombre,
          u.APELLIDO as apellido,
          u.EMAIL as email,
          u.IMAGEN_PERFIL as imagenPerfil
        FROM AMISTADES a
        JOIN USUARIOS u ON u.ID_USUARIO = a.USUARIO2
        WHERE a.USUARIO1 = :1
        UNION
        SELECT DISTINCT
          u.ID_USUARIO as id,
          u.NOMBRE as nombre,
          u.APELLIDO as apellido,
          u.EMAIL as email,
          u.IMAGEN_PERFIL as imagenPerfil
        FROM AMISTADES a
        JOIN USUARIOS u ON u.ID_USUARIO = a.USUARIO1
        WHERE a.USUARIO2 = :2
      `;

      const friends = await this.dataSource.query(friendsSql, [userIdNum, userIdNum]);
      
      return { success: true, friends };
    } catch (error) {
      console.error('Error obteniendo amigos', error);
      throw new HttpException('Error obteniendo lista de amigos', 500);
    }
  }
}
