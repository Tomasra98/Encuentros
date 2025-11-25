import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateEncuentroDto } from './dto/create-encuentro.dto';
import { UpdateEncuentroDto } from './dto/update-encuentro.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Encuentro } from './entities/encuentro.entity';
import { EncuentroResumen } from './entities/encuentro-resumen.entity';
import { Repository, DataSource } from 'typeorm';

@Injectable()
export class EncuentroService {
  constructor(
      @InjectRepository(Encuentro)
      private encuentrosRepository: Repository<Encuentro>,
      @InjectRepository(EncuentroResumen)
      private encuentroResumenRepository: Repository<EncuentroResumen>,
      private dataSource: DataSource,
    ) {}
  async create(createEncuentroDto: CreateEncuentroDto) {
    const { idCreador, titulo, descripcion, lugar, fecha } = createEncuentroDto as any;
    try {
      const fechaParam = fecha ? (fecha instanceof Date ? fecha : new Date(fecha)) : new Date();
      
      if (fechaParam.getTime() < Date.now()) {
        throw new BadRequestException('La fecha del encuentro no puede ser anterior a la fecha actual');
      }

      const result = await this.dataSource.query(
        `INSERT INTO encuentros (id_creador, titulo, descripcion, lugar, fecha, fecha_creacion) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id_encuentro`,
        [idCreador, titulo, descripcion, lugar, fechaParam]
      );

      return { success: true, id: result[0].id_encuentro };
    } catch (err) {
      throw err;
    }
  }

  async findAll(creadorId?: number) {
    if (creadorId) {
      const sql = `
        SELECT e.id_encuentro, e.id_creador, e.titulo, e.descripcion, e.lugar, e.fecha, e.fecha_creacion
        FROM encuentros e
        WHERE e.id_creador = $1
        UNION
        SELECT e.id_encuentro, e.id_creador, e.titulo, e.descripcion, e.lugar, e.fecha, e.fecha_creacion
        FROM encuentros e
        INNER JOIN participantes_encuentro pe ON e.id_encuentro = pe.id_encuentro
        WHERE pe.id_usuario = $2
        ORDER BY fecha DESC
      `;
      
      const result = await this.dataSource.query(sql, [creadorId, creadorId]);
      
      return result.map((row: any) => ({
        id: row.id_encuentro,
        idCreador: row.id_creador,
        titulo: row.titulo,
        descripcion: row.descripcion,
        lugar: row.lugar,
        fecha: row.fecha,
        fechaCreacion: row.fecha_creacion
      }));
    }
    return this.encuentrosRepository.find();
  }

  findOne(id: number) {
    return this.encuentrosRepository.findOne({ where: { id } });
  }

  async findAllWithResumen(creadorId?: number) {
    if (creadorId) {
      const sql = `
        SELECT DISTINCT
          e.id_encuentro,
          e.id_creador,
          e.titulo,
          e.descripcion,
          e.lugar,
          e.fecha,
          e.fecha_creacion,
          COALESCE(p.id_presupuesto, NULL) AS id_presupuesto,
          COALESCE(p.presupuesto_total, 0) AS presupuesto_total,
          COALESCE((
            SELECT COUNT(*) 
            FROM participantes_encuentro pe2 
            WHERE pe2.id_encuentro = e.id_encuentro
          ), 0) AS cant_participantes
        FROM encuentros e
        LEFT JOIN presupuestos p ON e.id_encuentro = p.id_encuentro
        WHERE e.id_encuentro IN (
          SELECT e2.id_encuentro 
          FROM encuentros e2 
          WHERE e2.id_creador = $1
          UNION
          SELECT pe.id_encuentro 
          FROM participantes_encuentro pe 
          WHERE pe.id_usuario = $2
        )
        ORDER BY e.fecha DESC
      `;
      
      const result = await this.dataSource.query(sql, [creadorId, creadorId]);
      
      return result.map((row: any) => ({
        id: row.id_encuentro,
        idCreador: row.id_creador,
        titulo: row.titulo,
        descripcion: row.descripcion,
        lugar: row.lugar,
        fecha: row.fecha,
        fechaCreacion: row.fecha_creacion,
        idPresupuesto: row.id_presupuesto,
        presupuestoTotal: row.presupuesto_total,
        cantParticipantes: row.cant_participantes
      }));
    }
    
    const sql = `
      SELECT DISTINCT
        e.id_encuentro,
        e.id_creador,
        e.titulo,
        e.descripcion,
        e.lugar,
        e.fecha,
        e.fecha_creacion,
        COALESCE(p.id_presupuesto, NULL) AS id_presupuesto,
        COALESCE(p.presupuesto_total, 0) AS presupuesto_total,
        COALESCE((
          SELECT COUNT(*) 
          FROM participantes_encuentro pe2 
          WHERE pe2.id_encuentro = e.id_encuentro
        ), 0) AS cant_participantes
      FROM encuentros e
      LEFT JOIN presupuestos p ON e.id_encuentro = p.id_encuentro
      ORDER BY e.fecha DESC
    `;
    
    const result = await this.dataSource.query(sql);
    
    return result.map((row: any) => ({
      id: row.id_encuentro,
      idCreador: row.id_creador,
      titulo: row.titulo,
      descripcion: row.descripcion,
      lugar: row.lugar,
      fecha: row.fecha,
      fechaCreacion: row.fecha_creacion,
      idPresupuesto: row.id_presupuesto,
      presupuestoTotal: row.presupuesto_total,
      cantParticipantes: row.cant_participantes
    }));
  }

  update(id: number, updateEncuentroDto: UpdateEncuentroDto) {
    return `This action updates a #${id} encuentro`;
  }

  remove(id: number) {
    return `This action removes a #${id} encuentro`;
  }
}
