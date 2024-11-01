CREATE TABLE public.categoria (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO public.categoria (nombre)
VALUES
    ('Recargable'),
    ('Desechable'),
    ('Repuesto'),
    ('Tabaqueria');


CREATE TABLE public.producto (
    id SERIAL PRIMARY KEY,
    imagen_url VARCHAR(255), -- Almacena la URL o ruta de la imagen del producto
    codigo VARCHAR(50) UNIQUE NOT NULL,
    cantidad INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    precio NUMERIC(10, 2) NOT NULL,
    costo NUMERIC(10, 2) NOT NULL,
    categoria_id INT REFERENCES public.categoria(id) ON DELETE SET NULL,
    descripcion TEXT
);
