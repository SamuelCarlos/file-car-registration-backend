const { eventNames } = require("cluster");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const { get } = require("https");
const app = express();
const cors = require("cors");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

/*
information type:

0 - uuid;
1 - tag;
2 - brand;
3 - model;
4 - date;

*/

const switchDataType = (type) => {
  const value = type.toLowerCase();
  switch (value) {
    case "uuid":
      return 0;
    case "tag":
      return 1;
    case "brand":
      return 2;
    case "model":
      return 3;
    case "date":
      return 4;
    default:
      return -1;
  }
};

const getDataFromFile = () => {
  const data = fs.readFileSync("parking-lot-data.txt", { encoding: "utf8" });
  return data.split(/\r?\n/).filter((item) => item !== "");
};

const getIndexFromFile = (type, givenInfo) => {
  const fileData = getDataFromFile();
  return fileData.findIndex((data, index) => {
    const user = data.split(";");
    if (user[type] === givenInfo) {
      return true;
    }
  });
};

const getInformation = (type, givenInfo) => {
  const fileData = getDataFromFile();

  return fileData.some((data) => {
    const user = data.split(";");
    return user[type] === givenInfo;
  });
};

app.post("/cars", (req, res) => {
  const { tag, brand, model } = req.body;
  const fullDate = new Date();
  const date = `${fullDate.getDate()}/${
    fullDate.getMonth() + 1
  }/${fullDate.getFullYear()}`;
  const uuid = uuidv4();

  if (!tag || !brand || !model) {
    return res.status(422).json({ message: "some data is missing." });
  }

  if (getInformation(switchDataType("tag"), tag)) {
    return res.status(409).json({ message: "existent data." });
  }

  const newData = `${uuid};${tag};${brand};${model};${date};\n`;

  fs.appendFile("./parking-lot-data.txt", newData, (err) => {
    if (err) return console.log(err);
  });

  return res.status(200).json({ uuid, tag, brand, model, date });
});

app.delete("/cars/:uuid", (req, res) => {
  const { uuid } = req.params;

  if (!getInformation(switchDataType("uuid"), uuid)) {
    return res.status(404).json({ message: "uuid not found." });
  }

  const fileData = getDataFromFile();

  fileData.splice(getIndexFromFile(switchDataType("uuid"), uuid), 1);
  const newData = fileData.join("\n");
  console.log(newData);

  fs.writeFile("./parking-lot-data.txt", newData, (err) => {
    if (err) return console.log(err);
  });

  return res.status(200).json({ message: "ok." });
});

app.put("/cars/:uuid", (req, res) => {
  const { uuid } = req.params;
  const { tag, brand, model, date } = req.body;

  if (!getInformation(switchDataType("uuid"), uuid)) {
    return res.status(404).json({ message: "uuid not found." });
  }

  const index = getIndexFromFile(switchDataType("uuid"), uuid);

  const fileData = getDataFromFile();

  const modified = fileData[index].split(";");

  modified[1] = tag ? tag : modified[1];
  modified[2] = brand ? brand : modified[2];
  modified[3] = model ? model : modified[3];
  modified[4] = date ? date : modified[4];

  fileData[index] = modified.join(";");

  const newValues = fileData.join("\n");

  fs.writeFile("./parking-lot-data.txt", newValues, (err) => {
    if (err) return console.log(err);
  });

  return res.status(200).json({
    uuid,
    tag: modified[1],
    brand: modified[2],
    model: modified[3],
    date: modified[4],
  });
});

app.get("/cars/:uuid", (req, res) => {
  const { uuid } = req.params;

  if (!getInformation(switchDataType("uuid"), uuid)) {
    return res.status(404).json({ message: "uuid not found." });
  }

  const index = getIndexFromFile(switchDataType("uuid"), uuid);

  const fileData = getDataFromFile();

  const requiredData = fileData[index].split(";");

  return res.status(200).json({
    uuid,
    tag: requiredData[1],
    brand: requiredData[2],
    model: requiredData[3],
    date: requiredData[4],
  });
});

app.get("/cars", (req, res) => {
  const data = getDataFromFile();
  const values = data.map((data) => {
    return data.split(";");
  });
  return res.status(200).json({ values });
});

app.listen(9000, () => {
  console.log("Your server is running at port 9000...");
});
