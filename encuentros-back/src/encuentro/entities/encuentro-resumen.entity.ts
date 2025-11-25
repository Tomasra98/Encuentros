import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'v_encuentro_resumen',
  expression: `
    SELECT
      e.id_encuentro,
      e.titulo,
      e.lugar,
      e.fecha,
      NVL(p.id_presupuesto, NULL) AS id_presupuesto,
      NVL(p.presupuesto_total, 0) AS presupuesto_total,
      NVL(b.id_bolsillo, NULL) AS id_bolsillo,
      NVL(b.nombre, 'SIN_BOLSILLO') AS nombre_bolsillo,
      NVL(b.saldo_actual, 0) AS saldo_bolsillo,
      NVL(pe.cant_participantes, 0) AS cant_participantes
    FROM Encuentros e
    LEFT JOIN Presupuestos p ON e.id_encuentro = p.id_encuentro
    LEFT JOIN Bolsillos b ON e.id_encuentro = b.id_encuentro
    LEFT JOIN (
      SELECT id_encuentro, COUNT(*) AS cant_participantes
      FROM Participantes_Encuentro
      GROUP BY id_encuentro
    ) pe ON e.id_encuentro = pe.id_encuentro
  `
})
export class EncuentroResumen {
  @ViewColumn({ name: 'id_encuentro' })
  idEncuentro: number;

  @ViewColumn({ name: 'titulo' })
  titulo: string;

  @ViewColumn({ name: 'lugar' })
  lugar: string;

  @ViewColumn({ name: 'fecha' })
  fecha: Date;

  @ViewColumn({ name: 'id_presupuesto' })
  idPresupuesto: number | null;

  @ViewColumn({ name: 'presupuesto_total' })
  presupuestoTotal: number;

  @ViewColumn({ name: 'id_bolsillo' })
  idBolsillo: number | null;

  @ViewColumn({ name: 'nombre_bolsillo' })
  nombreBolsillo: string;

  @ViewColumn({ name: 'saldo_bolsillo' })
  saldoBolsillo: number;

  @ViewColumn({ name: 'cant_participantes' })
  cantParticipantes: number;
}
