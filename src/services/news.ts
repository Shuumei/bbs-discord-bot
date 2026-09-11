import { Client, EmbedBuilder, TextChannel } from "discord.js";
import cron, { ScheduledTask } from "node-cron";
import { config } from "../config.js";
import { NewsArticle } from "../types/index.js";

// Mock/Initial News database (สามารถต่อยอดเป็น RSS/Web Scraper สำหรับ KLab หรือ Bleach Official ได้)
const INITIAL_NEWS: NewsArticle[] = [
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
  },
  {
    id: "bbs-gacha-recommendation",
    title: "💎 บทวิเคราะห์กาชาประจำสัปดาห์: ตู้ Selection คุ้มค่าแก่การกดหรือไม่?",
    category: "BBS_GACHA",
    summary: "ส่องเรตและสเตตัส 9 ตัวละครในตู้ มีตัว Carry Guild Quest สาย Espada และ Quincy หรือไม่!",
    details:
      "สำหรับสายประหยัด แนะนำให้เปิดเฉพาะ Step 1-2 (150/200 Orbs) เท่านั้น เนื่องจากตู้สิ้นเดือน (EoM) กำลังจะมาถึงในอีก 7 วันข้างหน้า เก็บ Orbs ไว้เปิดตัวละครเมต้าใหม่จะคุ้มค่ากว่ามาก!",
    sourceUrl: "https://www.bleach-bravesouls.com",
    publishedAt: new Date(),
  },
];

class NewsService {
  private articles: NewsArticle[] = [...INITIAL_NEWS];
  private scheduledTask: ScheduledTask | null = null;
  private configuredChannelId: string | null = config.newsChannelId || null;

  public setChannelId(channelId: string) {
    this.configuredChannelId = channelId;
  }

  public getChannelId(): string | null {
    return this.configuredChannelId;
  }

  public getLatestNews(limit = 3): NewsArticle[] {
    return this.articles.slice(0, limit);
  }

  public createNewsEmbed(article: NewsArticle): EmbedBuilder {
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

    const embed = new EmbedBuilder()
      .setColor(categoryColors[article.category] || 0xff4500)
      .setTitle(article.title)
      .setAuthor({
        name: `BBS Guild News • ${categoryLabels[article.category]}`,
        iconURL: "https://cdn.discordapp.com/emojis/104523456789012345.webp",
      })
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
        text: "Bleach & BBS Guild Companion • ข่าวสารอัปเดตอัตโนมัติประจำกิลด์",
      })
      .setTimestamp(article.publishedAt);

    if (article.bannerImage) {
      embed.setImage(article.bannerImage);
    }

    return embed;
  }

  public async broadcastNews(client: Client, channelIdOverride?: string): Promise<{ success: boolean; count: number; error?: string }> {
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
      const latestArticles = this.getLatestNews(1); // ส่งข่าวล่าสุด

      for (const article of latestArticles) {
        const embed = this.createNewsEmbed(article);
        await textChannel.send({
          content: "📢 **[ประกาศข่าวสารด่วนจาก Soul Society & BBS Guild]**",
          embeds: [embed],
        });
      }

      return { success: true, count: latestArticles.length };
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
        console.log("[NewsService] Running scheduled news broadcast...");
        const result = await this.broadcastNews(client);
        if (result.success) {
          console.log(`[NewsService] Successfully broadcasted ${result.count} news article(s).`);
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
