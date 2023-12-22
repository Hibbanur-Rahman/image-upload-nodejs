// const express = require("express");
// const multer = require("multer");
// const { GridFsStorage } = require("multer-gridfs-storage");
// const dotenv = require("dotenv");
// const { MongoClient, GridFSBucket } = require("mongodb");

// dotenv.config();

// const app = express();
// const port = process.env.PORT || 8765;
// const mongoUrl = process.env.MONGO_DB_URL;
// const dbName = "images";

// // Create MongoDB client
// const mongoClient = new MongoClient(mongoUrl);

// // Create GridFS storage engine
// const storage = new GridFsStorage({
//   url: mongoUrl,
//   file: (req, file) => {
//     if (file.mimetype.startsWith("image/")) {
//       return {
//         bucketName: "photos",
//         filename: `${Date.now()}_${file.originalname}`,
//       };
//     } else {
//       return `${Date.now()}_${file.originalname}`;
//     }
//   },
// });

// // Set up multer with the configured storage engine
// const upload = multer({ storage });

// // Middleware to handle errors during asynchronous operations
// const asyncMiddleware = (fn) => (req, res, next) => {
//   Promise.resolve(fn(req, res, next)).catch(next);
// };

// // Serve HTML form for image upload
// app.get("/", (req, res) => {
//   res.send(`
//     <form action="/upload/image" method="post" enctype="multipart/form-data">
//       <input type="file" name="avatar" />
//       <button type="submit">Upload</button>
//     </form>
//   `);
// });

// // Route for uploading an image
// app.post(
//   "/upload/image",
//   upload.single("avatar"),
//   asyncMiddleware(async (req, res) => {
//     const file = req.file;
//     res.send({
//       message: "Uploaded",
//       id: file.id,
//       name: file.filename,
//       contentType: file.contentType,
//     });
//   })
// );

// // ... (remaining routes remain unchanged)

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send({
//     message: "Error: Something went wrong",
//     error: err.message,
//   });
// });

// // Start the server
// const server = app.listen(port, () => {
//   console.log(`App started at port: ${port}`);
// });

// // Close MongoDB connection when the app is terminated
// process.on("SIGINT", async () => {
//   await mongoClient.close();
//   server.close(() => {
//     console.log("Server closed");
//     process.exit(0);
//   });
// });


const express = require("express")
const multer = require("multer")
const { GridFsStorage } = require("multer-gridfs-storage")
require("dotenv").config()
const MongoClient = require("mongodb").MongoClient
const GridFSBucket = require("mongodb").GridFSBucket

const url = process.env.MONGO_DB_URL

const mongoClient = new MongoClient(url)

// Create a storage object with a given configuration
const storage = new GridFsStorage({
  url,
  file: (req, file) => {
    //If it is an image, save to photos bucket
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      return {
        bucketName: "photos",
        filename: `${Date.now()}_${file.originalname}`,
      }
    } else {
      //Otherwise save to default bucket
      return `${Date.now()}_${file.originalname}`
    }
  },
})

// Set multer storage engine to the newly created object
const upload = multer({ storage })

const app = express()

app.post("/upload/image", upload.single("avatar"), (req, res) => {
  const file = req.file
  // Respond with the file details
  res.send({
    message: "Uploaded",
    id: file.id,
    name: file.filename,
    contentType: file.contentType,
  })
})

app.get("/images", async (req, res) => {
  try {
    await mongoClient.connect()

    const database = mongoClient.db("images")
    const images = database.collection("photos.files")
    const cursor = images.find({})
    const count = await cursor.count()
    if (count === 0) {
      return res.status(404).send({
        message: "Error: No Images found",
      })
    }

    const allImages = []

    await cursor.forEach(item => {
      allImages.push(item)
    })

    res.send({ files: allImages })
  } catch (error) {
    console.log(error)
    res.status(500).send({
      message: "Error Something went wrong",
      error,
    })
  }
})

app.get("/download/:filename", async (req, res) => {
  try {
    await mongoClient.connect()

    const database = mongoClient.db("images")

    const imageBucket = new GridFSBucket(database, {
      bucketName: "photos",
    })

    let downloadStream = imageBucket.openDownloadStreamByName(
      req.params.filename
    )

    downloadStream.on("data", function (data) {
      return res.status(200).write(data)
    })

    downloadStream.on("error", function (data) {
      return res.status(404).send({ error: "Image not found" })
    })

    downloadStream.on("end", () => {
      return res.end()
    })
  } catch (error) {
    console.log(error)
    res.status(500).send({
      message: "Error Something went wrong",
      error,
    })
  }
})

const server = app.listen(process.env.PORT || 8765, function () {
  const port = server.address().port

  console.log("App started at port:", port)
})