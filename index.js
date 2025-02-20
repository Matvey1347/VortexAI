import express from "express";
import Replicate from "replicate";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

app.use(express.json());
app.use(cors());

app.post("/generate-video", async (req, res) => {
  try {
    const input = {
      prompt:
        req.body.prompt ||
        "A man picks up a leather-bound book from a dusty shelf [Pedestal up], then begins reading it by candlelight [Static shot]",
      prompt_optimizer: true,
    };

    console.log("Запуск генерации видео...");

    // Запуск модели
    const output = await replicate.run("minimax/video-01", { input });

    if (!output) {
      return res.status(500).json({ error: "Не удалось сгенерировать видео" });
    }

    const videoUrl = output;
    console.log("Видео сгенерировано:", videoUrl);

    // Скачивание видео
    const videoResponse = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
    });

    const filename = `video_${Date.now()}.mp4`;
    const videosDir = path.join(__dirname, "videos");

    // Создаем папку videos, если её нет
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir);
    }

    const filePath = path.join(videosDir, filename);
    const writer = fs.createWriteStream(filePath);
    videoResponse.data.pipe(writer);

    writer.on("finish", () => {
      console.log("Видео сохранено:", filePath);
      const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
      res.json({ url: `${baseUrl}/videos/${filename}` });
      // res.json({ url: `http://localhost:${port}/videos/${filename}` });
    });

    writer.on("error", (error) => {
      console.error("Ошибка при сохранении видео:", error);
      res.status(500).json({ error: "Ошибка при сохранении видео" });
    });
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ error: "Ошибка генерации видео" });
  }
});

app.use("/videos", express.static(path.join(__dirname, "videos")));

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});