// netlify/functions/generate_post.js
import { createCanvas, loadImage, registerFont } from "canvas";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Procesamiento de la imagen (Sharp + Canvas)
async function processImage(imageUrl, title, logoPath) {
  console.log("Iniciando el procesamiento de la imagen...");

  try {
    // Convierte la URL de datos a un buffer
    const data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(data, "base64");

    // Redimensionamos la imagen original con Sharp
    console.log("Redimensionando imagen con Sharp...");
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(1080, 1080)
      .toBuffer();

    // Cargamos la imagen redimensionada en Canvas
    console.log("Cargando imagen en Canvas...");
    const image = await loadImage(resizedImageBuffer);
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext("2d");

    // Dibuja la imagen en el canvas
    console.log("Dibujando imagen en el canvas...");
    ctx.drawImage(image, 0, 0, 1080, 1080);

    // Crea un gradiente de abajo hacia arriba
    const gradient = ctx.createLinearGradient(0, 1080, 0, 270);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.9)"); // Parte oscura abajo
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)"); // Parte transparente arriba
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // Configura la fuente y el estilo del texto
    console.log("Configurando la fuente...");
    registerFont(path.resolve(__dirname, "BebasKai.ttf"), {
      family: "Bebas Kai",
    }); // Fuente relativa
    ctx.font = 'bold 70px "Bebas Kai"';
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Divide el título en varias líneas si es necesario
    console.log("Dividiendo el título en líneas...");
    const maxWidth = 1080;
    const words = title.split(" ");
    let line = "";
    const lines = [];
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line.trim());
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    console.log("Título dividido en líneas:", lines);

    // Dibuja el texto en el canvas
    const yOffset = 1080 - lines.length * 80 - 10;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, yOffset - 20, 1080, lines.length * 60 + 40);
    ctx.fillStyle = "white";
    lines.forEach((line, index) => {
      ctx.fillText(line, 540, yOffset + index * 60);
    });

    // Agrega el texto adicional ("Radio Uno Formosa")
    ctx.font = 'bold 30px "Bebas Kai"';
    ctx.fillText("Radio Uno Formosa", 540, 1080 / 2);

    // Carga el logo desde el buffer
    console.log("Agregando el logo al canvas...");
    const logo = await loadImage(path.resolve(__dirname, "logo.png")); // Logo relativo
    const logoWidth = 150;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    ctx.drawImage(logo, 1080 - logoWidth - 10, 10, logoWidth, logoHeight);

    // Guarda la imagen final procesada
    console.log("Convirtiendo la imagen final procesada a buffer...");
    const buffer = canvas.toBuffer("image/png");

    console.log("Buffer creado con éxito");

    // Regresa el buffer de la imagen final
    return {
      imageBuffer: buffer,
    };
  } catch (error) {
    console.error("Error en processImage:", error);
    console.trace();
    throw error;
  }
}

export const handler = async (event, context) => {
  try {
    console.log("Función generate_post ejecutada");

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Method Not Allowed" }),
      };
    }

    if (event.path === "/.netlify/functions/generate_post") {
      // Corregido
      console.log("Endpoint /generate_post llamado");
      const { title, imageUrl } = JSON.parse(event.body); // Recibe imageUrl en lugar de image
      console.log("Título:", title);
      console.log("URL de la imagen:", imageUrl);
      const logoPath = path.resolve(__dirname, "logo.png"); // Ruta relativa al logo

      console.log("Ruta del logo:", logoPath);

      // Procesa la imagen
      const { imageBuffer } = await processImage(imageUrl, title, logoPath);

      // Convierte el buffer a base64
      const imageBase64 = imageBuffer.toString("base64");

      console.log("Imagen procesada y convertida a base64");

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // ¡Cuidado en producción!
        },
        body: JSON.stringify({
          image: imageBase64, // Enviar la imagen en base64
        }),
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Route not found" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
