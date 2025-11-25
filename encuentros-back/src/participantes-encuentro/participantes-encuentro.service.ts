import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateParticipanteDto } from './dto/create-participante.dto';
import { UpdateParticipanteDto } from './dto/update-participante.dto';
import { ParticipanteEncuentro } from './entities/participante-encuentro.entity';
import { ParticipantesEncuentroView } from './entities/participantes-encuentro-view.entity';
import { VistaParticipantesAportes } from './entities/vista-participantes-aportes.entity';
import { Encuentro } from '../encuentro/entities/encuentro.entity';

@Injectable()
export class ParticipantesEncuentroService {
  constructor(
    @InjectRepository(ParticipanteEncuentro)
    private participanteRepository: Repository<ParticipanteEncuentro>,
    @InjectRepository(ParticipantesEncuentroView)
    private participantesViewRepository: Repository<ParticipantesEncuentroView>,
    @InjectRepository(VistaParticipantesAportes)
    private participantesAportesRepository: Repository<VistaParticipantesAportes>,
    @InjectRepository(Encuentro)
    private encuentroRepository: Repository<Encuentro>,
    private dataSource: DataSource,
  ) {}

  async create(createParticipanteDto: CreateParticipanteDto) {
    // Verificar que el encuentro existe
    const encuentro = await this.encuentroRepository.findOne({
      where: { id: createParticipanteDto.idEncuentro }
    });

    if (!encuentro) {
      throw new NotFoundException('El encuentro no existe');
    }

    // Verificar que el solicitante es el creador del encuentro
    if (encuentro.idCreador !== createParticipanteDto.idSolicitante) {
      throw new ForbiddenException('Solo el creador del encuentro puede agregar participantes');
    }

    // Verificar si el usuario ya está participando en el encuentro
    const existente = await this.participanteRepository.findOne({
      where: {
        idEncuentro: createParticipanteDto.idEncuentro,
        idUsuario: createParticipanteDto.idUsuario,
      },
    });

    if (existente) {
      throw new ConflictException('El usuario ya está participando en este encuentro');
    }

    const rol = createParticipanteDto.rol || 'participante';
    
    try {
      const sql = `
        INSERT INTO PARTICIPANTES_ENCUENTRO (ID_ENCUENTRO, ID_USUARIO, ROL)
        VALUES (:1, :2, :3)
      `;
      
      await this.dataSource.query(sql, [
        createParticipanteDto.idEncuentro,
        createParticipanteDto.idUsuario,
        rol
      ]);
      
      // Recuperar el registro insertado
      const inserted = await this.participanteRepository.findOne({
        where: {
          idEncuentro: createParticipanteDto.idEncuentro,
          idUsuario: createParticipanteDto.idUsuario,
        },
      });
      
      return inserted;
    } catch (error) {
      console.error('Error insertando participante:', error);
      throw new ConflictException('Error al agregar participante al encuentro');
    }
  }

  async findAll() {
    return await this.participanteRepository.find({
      relations: ['encuentro', 'usuario'],
    });
  }

  async findByEncuentro(idEncuentro: number) {
    return await this.participanteRepository.find({
      where: { idEncuentro },
      relations: ['usuario'],
    });
  }

  async findByUsuario(idUsuario: number) {
    return await this.participanteRepository.find({
      where: { idUsuario },
      relations: ['encuentro'],
    });
  }

  async findOne(id: number) {
    const participante = await this.participanteRepository.findOne({
      where: { id },
      relations: ['encuentro', 'usuario'],
    });

    if (!participante) {
      throw new NotFoundException(`Participante con ID ${id} no encontrado`);
    }

    return participante;
  }

  async update(id: number, updateParticipanteDto: UpdateParticipanteDto) {
    const participante = await this.findOne(id);
    Object.assign(participante, updateParticipanteDto);
    return await this.participanteRepository.save(participante);
  }

  async remove(id: number) {
    const participante = await this.findOne(id);
    await this.participanteRepository.remove(participante);
    return { message: 'Participante eliminado correctamente' };
  }

  async removeByEncuentroAndUsuario(idEncuentro: number, idUsuario: number) {
    const participante = await this.participanteRepository.findOne({
      where: { idEncuentro, idUsuario },
    });

    if (!participante) {
      throw new NotFoundException('Participante no encontrado');
    }

    await this.participanteRepository.remove(participante);
    return { message: 'Participante eliminado correctamente' };
  }

  // Métodos para consultar la vista V_PARTICIPANTES_ENCUENTRO
  async findAllFromView(idEncuentro?: number, idUsuario?: number) {
    let sql = `
      SELECT 
        ID_ENCUENTRO,
        TITULO_ENCUENTRO,
        FECHA,
        ID_USUARIO,
        NOMBRE_COMPLETO,
        ROL
      FROM V_PARTICIPANTES_ENCUENTRO
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (idEncuentro) {
      sql += ` AND ID_ENCUENTRO = :1`;
      params.push(idEncuentro);
    }
    
    if (idUsuario) {
      const paramIndex = params.length + 1;
      sql += ` AND ID_USUARIO = :${paramIndex}`;
      params.push(idUsuario);
    }
    
    sql += ` ORDER BY FECHA DESC, TITULO_ENCUENTRO`;
    
    const result = await this.dataSource.query(sql, params);
    
    return result.map((row: any) => ({
      idEncuentro: row.ID_ENCUENTRO,
      tituloEncuentro: row.TITULO_ENCUENTRO,
      fecha: row.FECHA,
      idUsuario: row.ID_USUARIO,
      nombreCompleto: row.NOMBRE_COMPLETO,
      rol: row.ROL
    }));
  }

  async findParticipantesByEncuentroFromView(idEncuentro: number) {
    return this.findAllFromView(idEncuentro, undefined);
  }

  async findEncuentrosByUsuarioFromView(idUsuario: number) {
    return this.findAllFromView(undefined, idUsuario);
  }

  // Métodos para consultar la vista VISTAPARTICIPANTESAPORTES
  async findParticipantesConAportes(idEncuentro?: number, idUsuario?: number) {
    let sql = `
      SELECT 
        ID_ENCUENTRO,
        NOMBRE_ENCUENTRO,
        ID_USUARIO,
        NOMBRE_USUARIO,
        APELLIDO_USUARIO,
        ROL,
        TOTAL_APORTES
      FROM VISTAPARTICIPANTESAPORTES
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (idEncuentro) {
      sql += ` AND ID_ENCUENTRO = :1`;
      params.push(idEncuentro);
    }
    
    if (idUsuario) {
      const paramIndex = params.length + 1;
      sql += ` AND ID_USUARIO = :${paramIndex}`;
      params.push(idUsuario);
    }
    
    sql += ` ORDER BY TOTAL_APORTES DESC, NOMBRE_USUARIO`;
    
    const result = await this.dataSource.query(sql, params);
    
    return result.map((row: any) => ({
      idEncuentro: row.ID_ENCUENTRO,
      nombreEncuentro: row.NOMBRE_ENCUENTRO,
      idUsuario: row.ID_USUARIO,
      nombreUsuario: row.NOMBRE_USUARIO,
      apellidoUsuario: row.APELLIDO_USUARIO,
      nombreCompleto: `${row.NOMBRE_USUARIO} ${row.APELLIDO_USUARIO}`,
      rol: row.ROL,
      totalAportes: row.TOTAL_APORTES || 0
    }));
  }

  async findAportesByEncuentro(idEncuentro: number) {
    return this.findParticipantesConAportes(idEncuentro, undefined);
  }

  async findAportesByUsuario(idUsuario: number) {
    return this.findParticipantesConAportes(undefined, idUsuario);
  }
}
