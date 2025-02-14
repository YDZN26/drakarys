/*tabla categoria*/
create table categoria(
categoria_id serial primary key,
nombre varchar(50)
);

insert into categoria(nombre) values ('Recargable');
insert into categoria(nombre) values ('Desechable');
insert into categoria(nombre) values ('Tabaqueria');
insert into categoria(nombre) values ('Repuesto');

/*tabla producto*/
create table producto(
producto_id SERIAL PRIMARY KEY,
imagen varchar(300),
codigo_barras int,
nombre varchar(255),
precio decimal(10,2),
costo decimal (10,2),
stock int,
descripcion text,
categoria_id int
);

alter table producto add constraint fk_prodcuto_categoria foreign key (categoria_id) references categoria (categoria_id);


/*tabla tipo de pago*/
create table tipo_de_pago(
tipo_pago_id serial primary key,
nombre varchar(50)
);

insert into tipo_de_pago(nombre) values('Cuota');
insert into tipo_de_pago(nombre) values ('Eectivo');
insert into tipo_de_pago(nombre) values ('Transferencia');
insert into tipo_de_pago(nombre) values('Tarjeta');

/*tabla usuario*/
create table usuario(
usuario_id serial primary key,
username varchar(50),
passwrd varchar(100)
);

/*tabla cuota*/
create table cuota(
cuota_id serial primary key,
monto decimal(10,2),
fecha timestamp,
venta_id int,
usuario_id int
);

alter table cuota add constraint fk_usuario_cuota foreign key (usuario_id) references usuario (usuario_id);

/*tabla gasto*/
create table gasto(
  gasto_id serial primary key,
  monto decimal(10,2),
  descripcion varchar(100),
  por_pagar boolean,
  fecha timestamp,
  tipo_pago_id int,
  usuario_id int
);

alter table gasto add constraint fk_gasto_tipo_pago foreign key (tipo_pago_id) references tipo_de_pago (tipo_pago_id);
alter table gasto add constraint fk_gasto_usuario foreign key (usuario_id) references usuario (usuario_id);

/*tabla de cliente*/
create table cliente(
  cliente_id serial primary key,
  nombre varchar(50),
  apellido varchar(50),
  telefono varchar(10)
);

insert into cliente(nombre, apellido, telefono) values('Clientes','varios', '00000000');

/*tabla venta*/
create table venta(
  venta_id serial primary key,
  fecha timestamp default current_timestamp,
  total decimal(10,2),
  tipo_pago_id int,
  cliente_id int,
  usuario_id int
);

alter table venta add constraint fk_venta_tipo_pago foreign key (tipo_pago_id) references tipo_de_pago (tipo_pago_id);
alter table venta add constraint fk_venta_cliente foreign key (cliente_id) references cliente (cliente_id);
alter table venta add constraint fk_venta_usuario foreign key (usuario_id) references usuario (usuario_id);



/*tabla venta detallada*/
create table venta_detallada(
  venta_detallada_id serial primary key,
  venta_id int,
  producto_id int,
  cantidad int,
  precio_unitario decimal(10,2),
  subtotal decimal(10,2)
);

alter table venta_detallada add constraint fk_venta_detallada_venta foreign key (venta_id) references venta (venta_id);
alter table venta_detallada add constraint fk_venta_detallada_producto foreign key (producto_id) references producto (producto_id);


/* drop table venta_detallada;
drop table producto;
drop table categoria;
drop table venta;
drop table gasto;
drop table cuota;
drop table cliente;
drop table tipo_de_pago;
drop table usuario; */