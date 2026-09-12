import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import cron, { ScheduledTask } from "node-cron";
import Parser from "rss-parser";
import { config } from "../config.js";
import { NewsArticle } from "../types/index.js";
import { aiService } from "./ai.js";

// แหล่งข้อมูล RSS ข่าวสารจริงของ Bleach & Bleach: Brave Souls
const RSS_FEEDS = [
  {
    name: "Bleach: Brave Souls (BBS)",
    url: "https://news.google.com/rss/search?q=Bleach+Brave+Souls&hl=en-US&gl=US&ceid=US:en",
    categoryHint: "BBS_UPDATE" as const,
  },
  {
    name: "Bleach: Thousand-Year Blood War",
    url: "https://news.google.com/rss/search?q=Bleach+anime+Thousand-Year+Blood+War&hl=en-US&gl=US&ceid=US:en",
    categoryHint: "ANIME_TYBW" as const,
  },
];

// ข้อมูลสำรองกรณีเครือข่าย RSS ขัดข้อง
const FALLBACK_NEWS: NewsArticle[] = [
  {
    id: "bleach-tybw-cour3",
    title: "⚡ Bleach: Thousand-Year Blood War - The Conflict (Cour 3) อัปเดตล่าสุด!",
    category: "ANIME_TYBW",
    summary: "การต่อสู้ ณ พระราชวังราชันวิญญาณเดือดทะลุปรอท พร้อมฉากต่อสู้ออริจินัลที่อาจารย์คุโบะควบคุมเอง!",
    details:
      "อนิเมะบลีช บทสงครามเลือดพันปี (TYBW) เพิ่มฉากต่อสู้ออริจินัลสุดเข้มข้นของหน่วยศูนย์ (Zero Squad) และการขยายบทบาทของชูทซ์สตัฟเฟิล (Schützstaffel) ห้ามพลาดทุกวันเสาร์!",
    sourceUrl: "https://bleach-anime.com",
    bannerImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    publishedAt: new Date(),
    sourceName: "Bleach Official",
  },
  {
    id: "bbs-eom-announcement",
    title: "🔥 BBS Update: ตู้ End of Month (EoM) & การปรับปรุง Guild Quest Very Hard!",
    category: "BBS_UPDATE",
    summary: "เตรียม Spirit Orbs ให้พร้อม! ตู้ใหม่มาพร้อมสกิลต้านทาน Damage to Weakened และตัวเบิร์สต์ระดับเทพ!",
    details:
      "KLab ประกาศอัปเดตระบบ Guild Quest ปรับเพิ่มคะแนนโบนัสสำหรับผู้เล่นที่เคลียร์ได้ภายใน 20 วินาที พร้อมเปิดตัวละครลิมิเต็ดร่างใหม่ที่มีอบิลิตี้ 'Frenzied Attack +2' และ 'Ignore Invincibility'!",
    sourceUrl: "https://www.bleach-bravesouls.com",
    bannerImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    publishedAt: new Date(),
    sourceName: "KLab BBS",
  },
];

const DATA_DIR = path.resolve(process.cwd(), "data");
const SENT_NEWS_FILE = path.join(DATA_DIR, "sent_news.json");

interface SentNewsRecord {
  sentIds: string[];
  lastBroadcastAt: string | null;
}

class NewsService {
  private articles: NewsArticle[] = [...FALLBACK_NEWS];
  private scheduledTask: ScheduledTask | null = null;
  private configuredChannelId: string | null = config.newsChannelId || null;
  private sentNewsIds: Set<string> = new Set();
  private rssParser: Parser = new Parser({
    timeout: 10000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) BBSGuildDiscordBot/1.0",
    },
  });

  constructor() {
    this.ensureDataDir();
    this.loadSentNewsHistory();
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.error("[NewsService] Failed to create data directory:", err);
    }
  }

  private loadSentNewsHistory() {
    try {
      if (fs.existsSync(SENT_NEWS_FILE)) {
        const raw = fs.readFileSync(SENT_NEWS_FILE, "utf-8");
        const parsed: SentNewsRecord = JSON.parse(raw);
        if (Array.isArray(parsed.sentIds)) {
          this.sentNewsIds = new Set(parsed.sentIds);
          console.log(`[NewsService] Loaded ${this.sentNewsIds.size} sent news ID(s) from persistent history.`);
        }
      }
    } catch (err) {
      console.warn("[NewsService] Could not read sent_news.json, initializing empty history:", err);
      this.sentNewsIds = new Set();
    }
  }

  private saveSentNewsHistory() {
    try {
      this.ensureDataDir();
      const record: SentNewsRecord = {
        sentIds: Array.from(this.sentNewsIds),
        lastBroadcastAt: new Date().toISOString(),
      };
      fs.writeFileSync(SENT_NEWS_FILE, JSON.stringify(record, null, 2), "utf-8");
    } catch (err) {
      console.error("[NewsService] Failed to persist sent_news.json:", err);
    }
  }

  public isNewsSent(id: string): boolean {
    return this.sentNewsIds.has(id);
  }

  public markNewsAsSent(id: string) {
    this.sentNewsIds.add(id);
    this.saveSentNewsHistory();
  }

  public setChannelId(channelId: string) {
    this.configuredChannelId = channelId;
  }

  public getChannelId(): string | null {
    return this.configuredChannelId;
  }

  /**
   * สร้าง Unique Hash ID สำหรับข่าวสารเพื่อตรวจจับข่าวซ้ำ
   */
  private generateNewsId(rawId: string | undefined, title: string, link: string | undefined): string {
    const key = rawId || link || title;
    return crypto.createHash("sha256").update(key.trim()).digest("hex").slice(0, 16);
  }

  /**
   * ล้าง HTML tags ออกจากข้อความ description
   */
  private cleanHtml(htmlText: string): string {
    return htmlText
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * ดึงข่าวสารจริงจาก RSS Feeds (Google News RSS สำหรับ Bleach & BBS)
   */
  public async fetchRealNews(limit = 5): Promise<NewsArticle[]> {
    const collectedArticles: NewsArticle[] = [];

    for (const feedConfig of RSS_FEEDS) {
      try {
        const feed = await this.rssParser.parseURL(feedConfig.url);

        for (const item of feed.items || []) {
          if (!item.title) continue;

          const id = this.generateNewsId(item.guid || item.id, item.title, item.link);
          const rawSnippet = this.cleanHtml(item.contentSnippet || item.content || item.summary || "");
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
          const source = (item as any).source || feedConfig.name;

          collectedArticles.push({
            id,
            title: item.title,
            category: feedConfig.categoryHint,
            summary: rawSnippet.slice(0, 250),
            details: rawSnippet,
            sourceUrl: item.link || undefined,
            publishedAt: pubDate,
            sourceName: typeof source === "string" ? source : (source?._ || feedConfig.name),
          });
        }
      } catch (err: any) {
        console.warn(`[NewsService] Failed to fetch RSS feed (${feedConfig.name}):`, err?.message || err);
      }
    }

    // ถ้าดึงข่าวจาก RSS ได้ ให้เรียงจากใหม่สุดไปเก่าสุด
    if (collectedArticles.length > 0) {
      // ขจัดข่าวซ้ำซ้อนในลิสต์เดียวกัน
      const uniqueMap = new Map<string, NewsArticle>();
      for (const article of collectedArticles) {
        if (!uniqueMap.has(article.id)) {
          uniqueMap.set(article.id, article);
        }
      }

      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
      );

      this.articles = sorted.slice(0, 15);
      return this.articles.slice(0, limit);
    }

    console.log("[NewsService] No live articles fetched, using fallback articles.");
    return this.articles.slice(0, limit);
  }

  public getLatestNews(limit = 3): NewsArticle[] {
    return this.articles.slice(0, limit);
  }

  public createNewsEmbed(article: NewsArticle, iconUrl?: string): EmbedBuilder {
    const categoryColors: Record<NewsArticle["category"], number> = {
      ANIME_TYBW: 0x9b59b6, // ม่วงเข้มโทนสงครามเลือดพันปี
      BBS_UPDATE: 0xe67e22, // ส้มสดใสโทน BBS
      BBS_GACHA: 0xf1c40f,  // ทองอร่ามโทนกาชา
      COMMUNITY: 0x3498db,  // ฟ้ากิลด์
    };

    const categoryLabels: Record<NewsArticle["category"], string> = {
      ANIME_TYBW: "🎬 Bleach TYBW Anime",
      BBS_UPDATE: "⚔️ BBS In-Game Update",
      BBS_GACHA: "💎 BBS Gacha & Banner",
      COMMUNITY: "🛡️ Guild Bulletin",
    };

    const authorData: { name: string; iconURL?: string } = {
      name: `BBS Guild News • ${categoryLabels[article.category]}`,
    };

    if (iconUrl) {
      authorData.iconURL = iconUrl;
    }

    const embed = new EmbedBuilder()
      .setColor(categoryColors[article.category] || 0xff4500)
      .setTitle(article.title)
      .setAuthor(authorData)
      .setDescription(`**${article.summary}**\n\n${article.details}`)
      .addFields(
        {
          name: "📅 วันที่ประกาศ",
          value: `<t:${Math.floor(article.publishedAt.getTime() / 1000)}:R>`,
          inline: true,
        },
        {
          name: "🔗 แหล่งข้อมูล",
          value: article.sourceUrl ? `[คลิกอ่านต่อที่นี่](${article.sourceUrl})` : "BBS Official",
          inline: true,
        }
      )
      .setFooter({
        text: `Bleach & BBS Companion • ที่มา: ${article.sourceName || "Official News"}`,
      })
      .setTimestamp(article.publishedAt);

    if (article.bannerImage) {
      embed.setImage(article.bannerImage);
    }

    return embed;
  }

  /**
   * บรอดแคสต์ข่าวสารไปยังห้องที่กำหนด พร้อมระบบตรวจข่าวซ้ำ (Deduplication)
   */
  public async broadcastNews(
    client: Client,
    channelIdOverride?: string,
    options?: { force?: boolean }
  ): Promise<{ success: boolean; count: number; error?: string; reason?: string }> {
    const targetChannelId = channelIdOverride || this.configuredChannelId;

    if (!targetChannelId) {
      return { success: false, count: 0, error: "ไม่มีการตั้งค่า NEWS_CHANNEL_ID ใน .env หรือผ่านคำสั่ง /news-config" };
    }

    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (!channel || !channel.isTextBased()) {
        return { success: false, count: 0, error: `ไม่พบช่องข้อความ ID: ${targetChannelId}` };
      }

      const textChannel = channel as TextChannel;

      // 1. ดึงข่าวสารจริงล่าสุด
      const freshNews = await this.fetchRealNews(5);

      // 2. กรองเฉพาะข่าวที่ "ยังไม่เคยส่ง" (Deduplication)
      let articlesToSend: NewsArticle[] = [];

      if (options?.force) {
        // หากผู้ใช้สั่ง Force ผ่านคำสั่งทดสอบ ให้หยิบข่าวล่าสุดมาส่ง
        articlesToSend = freshNews.slice(0, 1);
      } else {
        articlesToSend = freshNews.filter((article) => !this.isNewsSent(article.id)).slice(0, 2);
      }

      // หากไม่มีข่าวใหม่เลย ข้ามการส่งอัตโนมัติ ไม่สแปมห้อง
      if (articlesToSend.length === 0) {
        console.log("[NewsService] No new unsent news articles found. Broadcast skipped.");
        return { success: true, count: 0, reason: "NO_NEW_NEWS" };
      }

      // 3. แปลและสรุปข่าวด้วย AI ก่อนส่ง (ถ้าเปิดใช้งาน)
      for (const article of articlesToSend) {
        try {
          const aiSummary = await aiService.summarizeAndTranslateNews(
            article.title,
            article.details,
            article.sourceName
          );

          article.title = aiSummary.thaiTitle;
          article.summary = aiSummary.summary;
          article.category = aiSummary.category;
        } catch (e: any) {
          console.warn("[NewsService] AI summary skipped:", e?.message || e);
        }

        const botAvatarUrl = client.user?.displayAvatarURL();
        const embed = this.createNewsEmbed(article, botAvatarUrl);
        await textChannel.send({
          content: "📢 **[ประกาศข่าวสารด่วนจาก Soul Society & BBS Guild]**",
          embeds: [embed],
        });

        // บันทึกว่าข่าวนี้ถูกส่งไปแล้ว
        this.markNewsAsSent(article.id);
        console.log(`[NewsService] News broadcasted & marked as sent: [${article.id}] ${article.title}`);
      }

      return { success: true, count: articlesToSend.length };
    } catch (err: any) {
      console.error("[NewsService Broadcast Error]:", err?.message || err);
      return { success: false, count: 0, error: err?.message || "Unknown error" };
    }
  }

  public initScheduler(client: Client) {
    const cronSchedule = config.newsCronSchedule || "0 10 * * *";
    console.log(`[NewsService] Initializing news cron schedule: "${cronSchedule}"`);

    if (this.scheduledTask) {
      this.scheduledTask.stop();
    }

    this.scheduledTask = cron.schedule(
      cronSchedule,
      async () => {
        console.log("[NewsService] Running scheduled news broadcast check...");
        const result = await this.broadcastNews(client);
        if (result.success) {
          if (result.count > 0) {
            console.log(`[NewsService] Successfully broadcasted ${result.count} new news article(s).`);
          } else {
            console.log(`[NewsService] No new news to broadcast today (Skipped duplicate).`);
          }
        } else {
          console.warn(`[NewsService] Scheduled broadcast skipped or failed: ${result.error}`);
        }
      },
      {
        timezone: "Asia/Bangkok",
      }
    );
  }
}

export const newsService = new NewsService();
