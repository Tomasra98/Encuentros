CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    imagen_perfil VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encuentros (
    id_encuentro SERIAL PRIMARY KEY,
    id_creador INTEGER NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion VARCHAR(500),
    lugar VARCHAR(100),
    fecha TIMESTAMP NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_creador FOREIGN KEY (id_creador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS participantes_encuentro (
    id_participante SERIAL PRIMARY KEY,
    id_encuentro INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'participante',
    fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_encuentro_participante FOREIGN KEY (id_encuentro) REFERENCES encuentros(id_encuentro) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_participante FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT uq_participante UNIQUE(id_encuentro, id_usuario)
);

CREATE TABLE IF NOT EXISTS mensajes_chat (
    id_mensaje SERIAL PRIMARY KEY,
    id_encuentro INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_encuentro_mensaje FOREIGN KEY (id_encuentro) REFERENCES encuentros(id_encuentro) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_mensaje FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presupuestos (
    id_presupuesto SERIAL PRIMARY KEY,
    id_encuentro INTEGER NOT NULL,
    presupuesto_total DECIMAL(15,2) DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_encuentro_presupuesto FOREIGN KEY (id_encuentro) REFERENCES encuentros(id_encuentro) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS items_presupuesto (
    id_item SERIAL PRIMARY KEY,
    id_presupuesto INTEGER NOT NULL,
    id_encuentro INTEGER NOT NULL,
    nombre_item VARCHAR(200) NOT NULL,
    monto_item DECIMAL(15,2) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_presupuesto_item FOREIGN KEY (id_presupuesto) REFERENCES presupuestos(id_presupuesto) ON DELETE CASCADE,
    CONSTRAINT fk_encuentro_item FOREIGN KEY (id_encuentro) REFERENCES encuentros(id_encuentro) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bolsillos (
    id_bolsillo SERIAL PRIMARY KEY,
    id_presupuesto INTEGER,
    id_encuentro INTEGER NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    saldo_actual DECIMAL(15,2) DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_presupuesto_bolsillo FOREIGN KEY (id_presupuesto) REFERENCES presupuestos(id_presupuesto) ON DELETE SET NULL,
    CONSTRAINT fk_encuentro_bolsillo FOREIGN KEY (id_encuentro) REFERENCES encuentros(id_encuentro) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS aportes (
    id_aporte SERIAL PRIMARY KEY,
    id_bolsillo INTEGER,
    id_encuentro INTEGER NOT NULL,
    id_usuario INTEGER,
    monto DECIMAL(10,2) NOT NULL,
    fecha_aporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bolsillo_aporte FOREIGN KEY (id_bolsillo) REFERENCES bolsillos(id_bolsillo) ON DELETE SET NULL,
    CONSTRAINT fk_encuentro_aporte FOREIGN KEY (id_encuentro) REFERENCES encuentros(id_encuentro) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_aporte FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE INDEX idx_encuentros_creador ON encuentros(id_creador);
CREATE INDEX idx_encuentros_fecha ON encuentros(fecha);
CREATE INDEX idx_participantes_encuentro ON participantes_encuentro(id_encuentro);
CREATE INDEX idx_participantes_usuario ON participantes_encuentro(id_usuario);
CREATE INDEX idx_mensajes_encuentro ON mensajes_chat(id_encuentro);
CREATE INDEX idx_presupuestos_encuentro ON presupuestos(id_encuentro);
CREATE INDEX idx_items_presupuesto ON items_presupuesto(id_presupuesto);
CREATE INDEX idx_bolsillos_encuentro ON bolsillos(id_encuentro);
CREATE INDEX idx_aportes_bolsillo ON aportes(id_bolsillo);
CREATE INDEX idx_aportes_usuario ON aportes(id_usuario);
