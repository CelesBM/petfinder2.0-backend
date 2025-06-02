import { Model, DataTypes } from "sequelize";
import { sequelize } from "./connection";

export class Pet extends Model {}

Pet.init(
  {
    petName: DataTypes.STRING,
    petImgURL: DataTypes.STRING,
    petState: DataTypes.STRING,
    petLat: DataTypes.DECIMAL,
    petLong: DataTypes.DECIMAL,
    petLocation: DataTypes.STRING,
  },

  { sequelize, modelName: "pet" }
);
