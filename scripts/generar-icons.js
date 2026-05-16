var sharp = require('sharp');
var path = require('path');

var imagenOrigen = path.join(__dirname, '../src/assets/img/Logo Drakarys App-01.png');
var carpetaDestino = path.join(__dirname, '../src/assets/icons');

var tamanos = [72, 96, 128, 144, 152, 192, 384, 512];

function generarIcono(tamano) {
  var salida = path.join(carpetaDestino, 'icon-' + tamano + 'x' + tamano + '.png');

  return sharp(imagenOrigen)
    .resize({
      width: Math.round(tamano * 0.82),
      height: Math.round(tamano * 0.82),
      fit: 'contain',
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    })
    .png()
    .toBuffer()
    .then(function (logoRedimensionado) {
      return sharp({
        create: {
          width: tamano,
          height: tamano,
          channels: 4,
          background: '#001E87'
        }
      })
        .composite([
          {
            input: logoRedimensionado,
            gravity: 'center'
          }
        ])
        .png()
        .toFile(salida);
    })
    .then(function () {
      console.log('Icono generado: icon-' + tamano + 'x' + tamano + '.png');
    });
}

function generarIconos() {
  var proceso = Promise.resolve();

  tamanos.forEach(function (tamano) {
    proceso = proceso.then(function () {
      return generarIcono(tamano);
    });
  });

  proceso
    .then(function () {
      console.log('Todos los iconos fueron generados correctamente.');
    })
    .catch(function (error) {
      console.error('Error al generar los iconos:', error);
    });
}

generarIconos();
