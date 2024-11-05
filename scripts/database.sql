CREATE TABLE categoria (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50)
);

INSERT INTO categoria (nombre)
VALUES
    ('Recargable'),
    ('Desechable'),
    ('Repuesto'),
    ('Tabaqueria');


CREATE TABLE producto (
    id SERIAL PRIMARY KEY,
    imagen_url VARCHAR(255),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    cantidad INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    precio NUMERIC(10, 2) NOT NULL,
    costo NUMERIC(10, 2) NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categoria(id),
    descripcion TEXT
);
