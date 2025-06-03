import { Sequelize } from "sequelize";
import { v2 as cloudinary } from "cloudinary";
import algoliasearch from "algoliasearch";

import * as pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

console.log("SEQUELIZE_URL:", process.env.SEQUELIZE_URL);

if (!process.env.SEQUELIZE_URL) {
  throw new Error("SEQUELIZE_URL no está definida");
}

export const sequelize = new Sequelize(process.env.SEQUELIZE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

//Conectar y autenticar con algolia:
const client = algoliasearch(
  process.env.ALGOLIA_ID as string,
  process.env.ALGOLIA_APIKEY as string
);

export const userDataAlgolia = client.initIndex("users");
export const petDataAlgolia = client.initIndex("pets");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME, //luego process.env
  api_key: process.env.API_KEY, //luego process.env
  api_secret: process.env.API_SECRET, //luego process.env
});

export { cloudinary };

sequelize
  .authenticate()
  .then(() => {
    console.log("Conexión exitosa a la base de datos Neon.");
  })
  .catch((error) => {
    console.error("No se pudo conectar a la base de datos:", error);
  });
