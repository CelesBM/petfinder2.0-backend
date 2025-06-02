import { Model, DataTypes } from "sequelize";
import { sequelize } from "./connection";

export class Report extends Model {}

Report.init(
  {
    reportName: DataTypes.STRING,
    reportPhone: DataTypes.STRING,
    reportAbout: DataTypes.TEXT,
  },

  { sequelize, modelName: "report" }
);
