import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { parseOpml, OmplOutline } from '@/lib/rss-parser';
import { addRssSource, getAllRssSources } from '@/lib/db/news';
import { v4 as uuidv4 } from 'uuid';

// Default RSS sources from BestBlogs OPML files - comprehensive list
const DEFAULT_SOURCES: Array<{
  name: string;
  url: string;
  category: 'Articles' | 'Podcasts' | 'Twitters' | 'Videos';
  language: 'en' | 'zh' | 'ja' | 'ko';
}> = [
  // Articles from BestBlogs_RSS_Articles.opml (170 sources)
  { name: '人人都是产品经理', url: 'https://wechat2rss.bestblogs.dev/feed/2d790e38f8af54c5af77fa5fed687a7c66d34c22.xml', category: 'Articles', language: 'zh' },
  { name: '量子位', url: 'https://www.qbitai.com/feed', category: 'Articles', language: 'zh' },
  { name: 'LangChain Blog', url: 'https://blog.langchain.dev/rss/', category: 'Articles', language: 'en' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', category: 'Articles', language: 'en' },
  { name: 'AWS Machine Learning Blog', url: 'https://aws.amazon.com/blogs/amazon-ai/feed/', category: 'Articles', language: 'en' },
  { name: 'Engineering at Meta', url: 'https://engineering.fb.com/feed/', category: 'Articles', language: 'en' },
  { name: 'Microsoft Azure Blog', url: 'https://azure.microsoft.com/en-us/blog/feed/', category: 'Articles', language: 'en' },
  { name: 'Elastic Blog', url: 'https://www.elastic.co/blog/feed', category: 'Articles', language: 'en' },
  { name: 'Grafana Labs', url: 'https://grafana.com/categories/engineering/index.xml', category: 'Articles', language: 'en' },
  { name: '宝玉的分享', url: 'https://baoyu.io/feed.xml', category: 'Articles', language: 'zh' },
  { name: '掘金本周最热', url: 'https://rsshub.bestblogs.dev/juejin/trending/all/weekly', category: 'Articles', language: 'zh' },
  { name: 'deeplearning.ai', url: 'https://rsshub.bestblogs.dev/deeplearning/the-batch', category: 'Articles', language: 'en' },
  { name: '腾讯技术工程', url: 'https://wechat2rss.bestblogs.dev/feed/1e0ac39f8952b2e7f0807313cf2633d25078a171.xml', category: 'Articles', language: 'zh' },
  { name: 'ByteByteGo Newsletter', url: 'https://blog.bytebytego.com/feed', category: 'Articles', language: 'en' },
  { name: 'Google Cloud Blog', url: 'https://cloudblog.withgoogle.com/rss/', category: 'Articles', language: 'en' },
  { name: 'Last Week in AI', url: 'https://lastweekin.ai/feed/', category: 'Articles', language: 'en' },
  { name: 'Next.js Blog', url: 'https://nextjs.org/feed.xml', category: 'Articles', language: 'en' },
  { name: 'David Heinemeier Hansson', url: 'https://world.hey.com/dhh/feed.atom', category: 'Articles', language: 'en' },
  { name: 'Google DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/', category: 'Articles', language: 'en' },
  { name: 'Martin Fowler', url: 'https://martinfowler.com/feed.atom', category: 'Articles', language: 'en' },
  { name: 'AWS Architecture Blog', url: 'http://www.awsarchitectureblog.com/atom.xml', category: 'Articles', language: 'en' },
  { name: 'Spring Blog', url: 'http://spring.io/blog.atom', category: 'Articles', language: 'en' },
  { name: 'UX Magazine', url: 'https://uxmag.com/feed/', category: 'Articles', language: 'en' },
  { name: 'The JetBrains Blog', url: 'http://blog.jetbrains.com/feed/', category: 'Articles', language: 'en' },
  { name: 'Microsoft Research Blog', url: 'http://research.microsoft.com/rss/news.xml', category: 'Articles', language: 'en' },
  { name: 'InfoQ', url: 'http://www.infoq.com/rss/rss.action', category: 'Articles', language: 'en' },
  { name: 'Smashing Magazine', url: 'http://rss1.smashingmagazine.com/feed/', category: 'Articles', language: 'en' },
  { name: '机器之心', url: 'https://wechat2rss.bestblogs.dev/feed/8d97af31b0de9e48da74558af128a4673d78c9a3.xml', category: 'Articles', language: 'zh' },
  { name: '爱范儿', url: 'http://www.ifanr.com/feed', category: 'Articles', language: 'zh' },
  { name: 'The IntelliJ IDEA Blog', url: 'http://blogs.jetbrains.com/idea/feed/', category: 'Articles', language: 'en' },
  { name: '阮一峰的网络日志', url: 'http://feeds.feedburner.com/ruanyifeng', category: 'Articles', language: 'zh' },
  { name: 'The GitHub Blog', url: 'https://github.blog/feed/', category: 'Articles', language: 'en' },
  { name: 'freeCodeCamp.org', url: 'https://www.freecodecamp.org/news/rss/', category: 'Articles', language: 'en' },
  { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml', category: 'Articles', language: 'en' },
  { name: 'MongoDB Blog', url: 'https://www.mongodb.com/blog/rss', category: 'Articles', language: 'en' },
  { name: 'Databricks', url: 'https://www.databricks.com/feed', category: 'Articles', language: 'en' },
  { name: 'Visual Studio Blog', url: 'https://devblogs.microsoft.com/visualstudio/feed/', category: 'Articles', language: 'en' },
  { name: 'Google Developers Blog', url: 'https://developers.googleblog.com/feeds/posts/default', category: 'Articles', language: 'en' },
  { name: 'Node.js Blog', url: 'https://nodejs.org/en/feed/blog.xml', category: 'Articles', language: 'en' },
  { name: 'Docker', url: 'https://www.docker.com/feed/', category: 'Articles', language: 'en' },
  { name: '阿里技术', url: 'https://wechat2rss.bestblogs.dev/feed/6535a444e9651fecae3383363be7589acdebe2b6.xml', category: 'Articles', language: 'zh' },
  { name: '小米技术', url: 'https://wechat2rss.bestblogs.dev/feed/8bbc1ba1d363e70cd42d1ce89fb9070cb075c3b3.xml', category: 'Articles', language: 'zh' },
  { name: '哔哩哔哩技术', url: 'https://wechat2rss.bestblogs.dev/feed/3a12ae4fde5bb74aab2fddc9f710a3c057eab82f.xml', category: 'Articles', language: 'zh' },
  { name: '阿里云开发者', url: 'https://wechat2rss.bestblogs.dev/feed/39fc51b0b1316137e608c45da5dbbca4f9eb9538.xml', category: 'Articles', language: 'zh' },
  { name: '字节跳动技术团队', url: 'https://wechat2rss.bestblogs.dev/feed/d3a9e4d6f125cc98d1691dbc30cd97fec7ae2d03.xml', category: 'Articles', language: 'zh' },
  { name: '极客公园', url: 'https://wechat2rss.bestblogs.dev/feed/11ea7163fbea99e2ab9fa2812ac3d179574886cc.xml', category: 'Articles', language: 'zh' },
  { name: '美团技术团队', url: 'https://tech.meituan.com/feed/', category: 'Articles', language: 'zh' },
  { name: 'Stack Overflow Blog', url: 'http://blog.stackoverflow.com/feed/', category: 'Articles', language: 'en' },
  { name: 'Vercel News', url: 'https://vercel.com/atom', category: 'Articles', language: 'en' },
  { name: 'The Cloudflare Blog', url: 'https://blog.cloudflare.com/rss', category: 'Articles', language: 'en' },
  { name: 'ShowMeAI研究中心', url: 'https://wechat2rss.bestblogs.dev/feed/854a592a3bac3c2574d092daf4628cf65dfd1858.xml', category: 'Articles', language: 'zh' },
  { name: '奇舞精选', url: 'https://wechat2rss.bestblogs.dev/feed/156a64fe3e95eebe4b85bf981d6ebb85441897bf.xml', category: 'Articles', language: 'zh' },
  { name: '京东技术', url: 'https://wechat2rss.bestblogs.dev/feed/fa0be550682410cc187c0d1eab1a0fc4e073b949.xml', category: 'Articles', language: 'zh' },
  { name: '硅谷科技评论', url: 'https://wechat2rss.bestblogs.dev/feed/4515ee058133ff68570ad586abdd81f54f2b6ee3.xml', category: 'Articles', language: 'zh' },
  { name: '得物技术', url: 'https://wechat2rss.bestblogs.dev/feed/1cde72c9129b1f79cbb150166e7fed9a7568ee10.xml', category: 'Articles', language: 'zh' },
  { name: '百度Geek说', url: 'https://wechat2rss.bestblogs.dev/feed/6cc437d76f9dc4f7c35011c72e471e33e7bdd384.xml', category: 'Articles', language: 'zh' },
  { name: '大淘宝技术', url: 'https://wechat2rss.bestblogs.dev/feed/26fef2307bebc8673703f7e726982d8f56c9a219.xml', category: 'Articles', language: 'zh' },
  { name: 'Web3天空之城', url: 'https://wechat2rss.bestblogs.dev/feed/6aac3cc6d4c6df6fb3f77dea4ea4ba4a2053d6e7.xml', category: 'Articles', language: 'zh' },
  { name: 'AI前线', url: 'https://wechat2rss.bestblogs.dev/feed/25185b01482da0f485418ecb92e208b4416712fb.xml', category: 'Articles', language: 'zh' },
  { name: '新智元', url: 'https://wechat2rss.bestblogs.dev/feed/e531a18b21c34cf787b83ab444eef659d7a980de.xml', category: 'Articles', language: 'zh' },
  { name: '51CTO技术栈', url: 'https://wechat2rss.bestblogs.dev/feed/d1fabe6c569ffc44979075dde2f57c65e07c3045.xml', category: 'Articles', language: 'zh' },
  { name: '优设', url: 'https://wechat2rss.bestblogs.dev/feed/8fee9d33e883a769a59a5a3e27d249cf8567b55a.xml', category: 'Articles', language: 'zh' },
  { name: '前端充电宝', url: 'https://wechat2rss.bestblogs.dev/feed/efed19b684285ee14f88b3f234b350fba9376d7a.xml', category: 'Articles', language: 'zh' },
  { name: '稀土掘金技术社区', url: 'https://wechat2rss.bestblogs.dev/feed/33ecd2122ae788ea02dfcf1df857a54b9ae1338d.xml', category: 'Articles', language: 'zh' },
  { name: '腾讯云开发者', url: 'https://wechat2rss.bestblogs.dev/feed/6cec2c211479a5502896375860009782cf10c2ba.xml', category: 'Articles', language: 'zh' },
  { name: '体验进阶', url: 'https://wechat2rss.bestblogs.dev/feed/083c360a74b36b2c33820a995d21cbf60c813c0a.xml', category: 'Articles', language: 'zh' },
  { name: '前端早读课', url: 'https://wechat2rss.bestblogs.dev/feed/ce2456e157156d42259c1198f05a33e27b1ed959.xml', category: 'Articles', language: 'zh' },
  { name: '开源服务指南', url: 'https://wechat2rss.bestblogs.dev/feed/c125f09ef36fd6b6cb092c409e69a5bcc867d378.xml', category: 'Articles', language: 'zh' },
  { name: 'dbaplus社群', url: 'https://wechat2rss.bestblogs.dev/feed/a92cc44a756e2b9165fed5572aa7337843a73eee.xml', category: 'Articles', language: 'zh' },
  { name: '超人的电话亭', url: 'https://wechat2rss.bestblogs.dev/feed/4be15abcd5621887bb7c1e2efd2d1cd8c68a16f0.xml', category: 'Articles', language: 'zh' },
  { name: 'Qunar技术沙龙', url: 'https://wechat2rss.bestblogs.dev/feed/84c072f8d34d1690f2783d7dda6013cf6d892b7f.xml', category: 'Articles', language: 'zh' },
  { name: '42章经', url: 'https://wechat2rss.bestblogs.dev/feed/f6694726ced4ba3d7c7cd65c6edf2160c5978387.xml', category: 'Articles', language: 'zh' },
  { name: '随机小分队', url: 'https://wechat2rss.bestblogs.dev/feed/115e814e7b12d373a55459cb2aea3223152f2af2.xml', category: 'Articles', language: 'zh' },
  { name: '阿里研究院', url: 'https://wechat2rss.bestblogs.dev/feed/e2f1190c120f7f3d74b630bfcfe9e58296bd535c.xml', category: 'Articles', language: 'zh' },
  { name: '深思圈', url: 'https://wechat2rss.bestblogs.dev/feed/3e6fcb56a39b2e18f1036113655d4ff8fe726b62.xml', category: 'Articles', language: 'zh' },
  { name: 'Hugging Face', url: 'https://wechat2rss.bestblogs.dev/feed/8b68fdb4f24ab2287100988a8cec36363fec4214.xml', category: 'Articles', language: 'zh' },
  { name: '创业邦', url: 'https://wechat2rss.bestblogs.dev/feed/f5e0d8e342d9e2ec5b2942f08522cfaec17acc8d.xml', category: 'Articles', language: 'zh' },
  { name: 'Founder Park', url: 'https://wechat2rss.bestblogs.dev/feed/f940695505f2be1399d23cc98182297cadf6f90d.xml', category: 'Articles', language: 'zh' },
  { name: 'vivo互联网技术', url: 'https://wechat2rss.bestblogs.dev/feed/b3ceb5cb1e4602ca55704650a157ec9c5b2f0d31.xml', category: 'Articles', language: 'zh' },
  { name: '歸藏的AI工具箱', url: 'https://wechat2rss.bestblogs.dev/feed/1c3e3571b1627d23ee9c64521a0b0a41d3fe2987.xml', category: 'Articles', language: 'zh' },
  { name: 'Clip设计夹', url: 'https://wechat2rss.bestblogs.dev/feed/ebd5f5bd705dd531066eeca5ee500a1e6a269e17.xml', category: 'Articles', language: 'zh' },
  { name: 'The Keyword', url: 'https://blog.google/rss', category: 'Articles', language: 'en' },
  { name: '腾讯科技', url: 'https://wechat2rss.bestblogs.dev/feed/a81bdfcbb9eefe870d285e81510ffa1af26e4520.xml', category: 'Articles', language: 'zh' },
  { name: 'InfoQ 中文', url: 'https://wechat2rss.bestblogs.dev/feed/13da94d7eb314b49fa251cb7e8399cae29d772db.xml', category: 'Articles', language: 'zh' },
  { name: 'LlamaIndex Blog', url: 'https://www.llamaindex.ai/blog/feed', category: 'Articles', language: 'en' },
  { name: 'Dify', url: 'https://wechat2rss.bestblogs.dev/feed/e46c03a4cb65509e22ab9a8507888a2096319d65.xml', category: 'Articles', language: 'zh' },
  { name: '海外独角兽', url: 'https://wechat2rss.bestblogs.dev/feed/7200d3a5e976d231deb1e40ad33745c0e649b029.xml', category: 'Articles', language: 'zh' },
  { name: 'CSDN', url: 'https://wechat2rss.bestblogs.dev/feed/b0b7f2852aecdcc5a0eb08d33afc1c08b855d98b.xml', category: 'Articles', language: 'zh' },
  { name: '谷歌开发者', url: 'https://wechat2rss.bestblogs.dev/feed/9c65b8470acb8a5400199616536995d5ba90f52e.xml', category: 'Articles', language: 'zh' },
  { name: '赛博禅心', url: 'https://wechat2rss.bestblogs.dev/feed/752c31ca0446b837339463fc5440539e20267d2f.xml', category: 'Articles', language: 'zh' },
  { name: '笔记侠', url: 'https://wechat2rss.bestblogs.dev/feed/4c5d9bcc2fbfcd1dc81fb67559653f8957ef4760.xml', category: 'Articles', language: 'zh' },
  { name: '小红书技术REDtech', url: 'https://wechat2rss.bestblogs.dev/feed/0f8c47df6fd304112518544776e0bbf1d98ba0b9.xml', category: 'Articles', language: 'zh' },
  { name: '智谱', url: 'https://wechat2rss.bestblogs.dev/feed/433d2134dca54d80804daf32e8be546155be3300.xml', category: 'Articles', language: 'zh' },
  { name: '月之暗面 Kimi', url: 'https://wechat2rss.bestblogs.dev/feed/c5c43d4bc17bae656763859ed0903bb6314ec6fe.xml', category: 'Articles', language: 'zh' },
  { name: '通义大模型', url: 'https://wechat2rss.bestblogs.dev/feed/4ebee6222ae08705b8aabc9116f0defbcb6b17c6.xml', category: 'Articles', language: 'zh' },
  { name: '百度AI', url: 'https://wechat2rss.bestblogs.dev/feed/d0767d885e6ba213344fb0c0408c51331e23a994.xml', category: 'Articles', language: 'zh' },
  { name: 'HelloGitHub', url: 'https://wechat2rss.bestblogs.dev/feed/e6cc80b97bf64eeef61cc5927c78ba6ce3356422.xml', category: 'Articles', language: 'zh' },
  { name: '经纬创投', url: 'https://wechat2rss.bestblogs.dev/feed/05efb1c4cf91e5a37443cc323150ea38a838e9fd.xml', category: 'Articles', language: 'zh' },
  { name: '腾讯混元', url: 'https://wechat2rss.bestblogs.dev/feed/306ce19a1ca590c9c2df781789e828d1acfa1356.xml', category: 'Articles', language: 'zh' },
  { name: 'Qdrant', url: 'https://qdrant.tech/index.xml', category: 'Articles', language: 'en' },
  { name: '刘润', url: 'https://wechat2rss.bestblogs.dev/feed/c1354f67c314d25d6e236a58724043bdc46d6079.xml', category: 'Articles', language: 'zh' },
  { name: '吴晓波频道', url: 'https://wechat2rss.bestblogs.dev/feed/604fd0bfbb0214958f7fd2718509e4ea038c6afc.xml', category: 'Articles', language: 'zh' },
  { name: '智东西', url: 'https://wechat2rss.bestblogs.dev/feed/cfd52b4245ca6119b2fda4ef934832c689028927.xml', category: 'Articles', language: 'zh' },
  { name: '腾讯研究院', url: 'https://wechat2rss.bestblogs.dev/feed/6152301e0978bffb0a8284cab339262b9764dcfb.xml', category: 'Articles', language: 'zh' },
  { name: 'SuperTechFans', url: 'https://www.supertechfans.com/cn/index.xml', category: 'Articles', language: 'en' },
  { name: '有机大橘子', url: 'https://wechat2rss.bestblogs.dev/feed/6cef434b771dd75a91864b2e699a622cb4e3eb33.xml', category: 'Articles', language: 'zh' },
  { name: 'Thoughtworks洞见', url: 'https://wechat2rss.bestblogs.dev/feed/96b507f9985efa59e549e95a6363c2b6edfa8f2e.xml', category: 'Articles', language: 'zh' },
  { name: '浮之静', url: 'https://wechat2rss.bestblogs.dev/feed/abb0de0c0cb8f684a1606a4b20121b245547adce.xml', category: 'Articles', language: 'zh' },
  { name: '数字生命卡兹克', url: 'https://wechat2rss.bestblogs.dev/feed/ff621c3e98d6ae6fceb3397e57441ffc6ea3c17f.xml', category: 'Articles', language: 'zh' },
  { name: 'AI产品黄叔', url: 'https://wechat2rss.bestblogs.dev/feed/1f1030491e15e5349aae42367513d6b3f70a8f8b.xml', category: 'Articles', language: 'zh' },
  { name: '印记中文', url: 'https://wechat2rss.bestblogs.dev/feed/2b038bb5307a75a603405f7191b5030576d3e8bd.xml', category: 'Articles', language: 'zh' },
  { name: '真格基金', url: 'https://wechat2rss.bestblogs.dev/feed/47798a14d51da72e68fae4f7a259f096750cf03e.xml', category: 'Articles', language: 'zh' },
  { name: '大模型智能', url: 'https://wechat2rss.bestblogs.dev/feed/bfc6440c1a2443fab9a6bf607137d41db5cd5c93.xml', category: 'Articles', language: 'zh' },
  { name: '甲子光年', url: 'https://wechat2rss.bestblogs.dev/feed/1c4008936645d5c17239d99bba91522cf2bdfa26.xml', category: 'Articles', language: 'zh' },
  { name: 'Z Potentials', url: 'https://wechat2rss.bestblogs.dev/feed/c47f4bc00ea912c37b6e23b22b146db0e85b3e19.xml', category: 'Articles', language: 'zh' },
  { name: '深网腾讯新闻', url: 'https://wechat2rss.bestblogs.dev/feed/396591aa7d3ef15fa3b5b17ec4b1aa840ebde335.xml', category: 'Articles', language: 'zh' },
  { name: 'AI炼金术', url: 'https://wechat2rss.bestblogs.dev/feed/4915f3747653bbb9c7975323c11b768d2b9cd6c9.xml', category: 'Articles', language: 'zh' },
  { name: '白鲸出海', url: 'https://wechat2rss.bestblogs.dev/feed/2b8f03a73a0f2ac92a8ca69c124e5be6f442dbdc.xml', category: 'Articles', language: 'zh' },
  { name: '硅星人Pro', url: 'https://wechat2rss.bestblogs.dev/feed/c62ceda9eed269d851802bdbc5f33c4fabbf7462.xml', category: 'Articles', language: 'zh' },
  { name: 'AI科技评论', url: 'https://wechat2rss.bestblogs.dev/feed/789e5fefb9cc2646ba7b680cb7a88378a34eb7a4.xml', category: 'Articles', language: 'zh' },
  { name: '山行AI', url: 'https://wechat2rss.bestblogs.dev/feed/98bc16b6f53902a2ab511b4faa3499e0a1c78eb1.xml', category: 'Articles', language: 'zh' },
  { name: '魔搭ModelScope社区', url: 'https://wechat2rss.bestblogs.dev/feed/d993a885260f96057b9a4c96212cb2c95bb5054b.xml', category: 'Articles', language: 'zh' },
  { name: '强少来了', url: 'https://wechat2rss.bestblogs.dev/feed/3c36fe804f63a7b936e372a37929d81fa0ad948a.xml', category: 'Articles', language: 'zh' },
  { name: '土猛的员外', url: 'https://wechat2rss.bestblogs.dev/feed/3ee671d065adc460bc20bbd269115987098c54a0.xml', category: 'Articles', language: 'zh' },
  { name: '暗涌Waves', url: 'https://wechat2rss.bestblogs.dev/feed/bd586c1499b56aaec02dfefa87126232d234b010.xml', category: 'Articles', language: 'zh' },
  { name: '夕小瑶科技说', url: 'https://wechat2rss.bestblogs.dev/feed/64b57d666259aee6bd097e76164e4a8371f0ad04.xml', category: 'Articles', language: 'zh' },
  { name: 'DeeplearningAI', url: 'https://wechat2rss.bestblogs.dev/feed/9d094d066a5faacff0eb0a6b95efbba20d4f1fc9.xml', category: 'Articles', language: 'zh' },
  { name: '机器之心SOTA模型', url: 'https://wechat2rss.bestblogs.dev/feed/2f520471856d56c7b3a95cd09eb777149b32828a.xml', category: 'Articles', language: 'zh' },
  { name: '阶跃星辰', url: 'https://wechat2rss.bestblogs.dev/feed/3e2714d06aa36142e8ed6b3f4e5cf9090a069dd2.xml', category: 'Articles', language: 'zh' },
  { name: '快手技术', url: 'https://wechat2rss.bestblogs.dev/feed/c4cc10d2e32a5fa12927581ae581a336f399fe75.xml', category: 'Articles', language: 'zh' },
  { name: 'DeepSeek', url: 'https://wechat2rss.bestblogs.dev/feed/1709da4f538d4ce4fb6d7a8ba1a5a1c297919601.xml', category: 'Articles', language: 'zh' },
  { name: '字节跳动Seed', url: 'https://wechat2rss.bestblogs.dev/feed/6efd40bb335d2037f365d284cb5e00f0843e737e.xml', category: 'Articles', language: 'zh' },
  { name: '十字路口Crossing', url: 'https://wechat2rss.bestblogs.dev/feed/20492a5f2d3637c178c01ab0bab7ed86a4a0995b.xml', category: 'Articles', language: 'zh' },
  { name: '青哥谈AI', url: 'https://wechat2rss.bestblogs.dev/feed/00a1da3493512c20aff1ea5a0d1a02537e931b36.xml', category: 'Articles', language: 'zh' },
  { name: 'AI Musings by Mu', url: 'https://kelvinmu.substack.com/feed', category: 'Articles', language: 'en' },
  { name: 'Latent Space', url: 'https://www.latent.space/feed', category: 'Articles', language: 'en' },
  { name: 'AI寒武纪', url: 'https://wechat2rss.bestblogs.dev/feed/5903009f48a5e4aa44d8ac941a54fe3aafc3e03c.xml', category: 'Articles', language: 'zh' },
  { name: 'MiniMax 稀宇科技', url: 'https://wechat2rss.bestblogs.dev/feed/00306b171f754d463b28cf83f3ba086ad009b430.xml', category: 'Articles', language: 'zh' },
  { name: 'Jina AI', url: 'https://wechat2rss.bestblogs.dev/feed/ff2c5468828ebe7236afd6c1d128e219774487c2.xml', category: 'Articles', language: 'zh' },
  { name: '花叔', url: 'https://wechat2rss.bestblogs.dev/feed/ed3e181242a4622709081439d802523ecf7b78f2.xml', category: 'Articles', language: 'zh' },
  { name: 'Datawhale', url: 'https://wechat2rss.bestblogs.dev/feed/ea0dd8bddfe4fbfb32eaa81a1e1b628d45e97a80.xml', category: 'Articles', language: 'zh' },
  { name: 'AINLP', url: 'https://wechat2rss.bestblogs.dev/feed/875df1d1a991bf9250ba9813e3148f58ef2240d4.xml', category: 'Articles', language: 'zh' },
  { name: 'Groq', url: 'https://api.bestblogs.dev/feed/groqBlog', category: 'Articles', language: 'en' },
  { name: 'ElevenLabs Blog', url: 'https://api.bestblogs.dev/feed/elevenLabsBlog', category: 'Articles', language: 'en' },
  { name: 'FireCrawl Blog', url: 'https://api.bestblogs.dev/feed/fireCrawlBlog', category: 'Articles', language: 'en' },
  { name: 'Gino Notes', url: 'https://www.ginonotes.com/feed.xml', category: 'Articles', language: 'en' },
  { name: '向阳乔木推荐看', url: 'https://wechat2rss.bestblogs.dev/feed/3e50f11753a7c5ed689565fbf5abf96cb4541c57.xml', category: 'Articles', language: 'zh' },
  { name: 'Simon Willison Weblog', url: 'https://simonwillison.net/atom/everything/', category: 'Articles', language: 'en' },
  { name: '乌鸦智能说', url: 'https://wechat2rss.bestblogs.dev/feed/f21c3e34df9b5fecfda57e2e53512864255ed4cd.xml', category: 'Articles', language: 'zh' },
  { name: 'yikai 的摸鱼笔记', url: 'https://wechat2rss.bestblogs.dev/feed/13492cb50df57702cdc0dfa71467cd03f9dd69be.xml', category: 'Articles', language: 'zh' },
  { name: '李继刚', url: 'https://wechat2rss.bestblogs.dev/feed/9645a69180041ff935c458753174fa8bc2061295.xml', category: 'Articles', language: 'zh' },
  { name: '沃垠AI', url: 'https://wechat2rss.bestblogs.dev/feed/339818dbd5154cecdf5f4161f3391c7038a72bae.xml', category: 'Articles', language: 'zh' },
  { name: 'L先生说', url: 'https://wechat2rss.bestblogs.dev/feed/31c7fb6f7959a5ff90ae997b536e78b8b3f23321.xml', category: 'Articles', language: 'zh' },
  { name: '有新Newin', url: 'https://wechat2rss.bestblogs.dev/feed/74554dcb3da8982083426b871bc8c314a9de9729.xml', category: 'Articles', language: 'zh' },
  { name: '晚点LatePost', url: 'https://wechat2rss.bestblogs.dev/feed/c442206ec9957f3c52f2f40300ca532079538b31.xml', category: 'Articles', language: 'zh' },
  { name: '袋鼠帝AI客栈', url: 'https://wechat2rss.bestblogs.dev/feed/24d0930cc9f4f0c708182dc1c087d41e1f4cbd33.xml', category: 'Articles', language: 'zh' },
  { name: 'AI科技大本营', url: 'https://wechat2rss.bestblogs.dev/feed/dfd3b5e742e32d8032a445832373191957202bf3.xml', category: 'Articles', language: 'zh' },
  { name: '卡尔的AI沃茨', url: 'https://wechat2rss.bestblogs.dev/feed/8a1fc997e5c742e91ad7c253836c28ca3a69ccb1.xml', category: 'Articles', language: 'zh' },
  { name: '逛逛GitHub', url: 'https://wechat2rss.bestblogs.dev/feed/38be32e5376d852c13d3383e4d7a757fd9a55ff6.xml', category: 'Articles', language: 'zh' },
  { name: '阿真Irene', url: 'https://wechat2rss.bestblogs.dev/feed/d5ead392b0cf117d0ba4070e2261111fdde49711.xml', category: 'Articles', language: 'zh' },
  { name: '网易科技', url: 'https://wechat2rss.bestblogs.dev/feed/028fbc21062e744c7b606880ebca01e22cb4b7b7.xml', category: 'Articles', language: 'zh' },
  { name: '架构师之路', url: 'https://wechat2rss.bestblogs.dev/feed/f6dec1c3ad16e43532dd427c85eaeb3a7b7b084e.xml', category: 'Articles', language: 'zh' },
  { name: '硅谷101', url: 'https://wechat2rss.bestblogs.dev/feed/8f8fe34034f6123b168ed7847c51d50ff47cd7ee.xml', category: 'Articles', language: 'zh' },
  { name: 'Anthropic News', url: 'https://rsshub.bestblogs.dev/anthropic/news', category: 'Articles', language: 'en' },
  { name: 'AI at Meta Blog', url: 'https://rsshub.app/meta/ai/blog', category: 'Articles', language: 'en' },
  { name: '少数派', url: 'https://wechat2rss.bestblogs.dev/feed/f0e37a7d597231efed4bf6dd05b5d904de6dbcc1.xml', category: 'Articles', language: 'zh' },
  { name: '语言即世界', url: 'https://wechat2rss.bestblogs.dev/feed/e1ed0d3edd93f90aef602105eb7ca51b35b7060a.xml', category: 'Articles', language: 'zh' },
  { name: '刘小排r', url: 'https://wechat2rss.bestblogs.dev/feed/484d4199ae6c0b72ea01e7e0597a1f74933dfb62.xml', category: 'Articles', language: 'zh' },
  { name: 'Elevate', url: 'https://addyo.substack.com/feed', category: 'Articles', language: 'en' },
  { name: '43 Talks', url: 'https://wechat2rss.bestblogs.dev/feed/4efe7ec6970afd4a050d6f10b9e8131a9d5e6816.xml', category: 'Articles', language: 'zh' },

  // Podcasts from BestBlogs_RSS_Podcasts.opml (31 sources)
  { name: "What's Next | 科技早知道", url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e74b52c418a84a046ecaceb', category: 'Podcasts', language: 'zh' },
  { name: '无人知晓', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/611719d3cb0b82e1df0ad29e', category: 'Podcasts', language: 'zh' },
  { name: '硅谷101', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e5c52c9418a84a04625e6cc', category: 'Podcasts', language: 'zh' },
  { name: '三五环', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e280fab418a84a0461faa3c', category: 'Podcasts', language: 'zh' },
  { name: '张小珺Jùn | 商业访谈录', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/626b46ea9cbbf0451cf5a962', category: 'Podcasts', language: 'zh' },
  { name: '42章经', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/648b0b641c48983391a63f98', category: 'Podcasts', language: 'zh' },
  { name: '十字路口Crossing', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/60502e253c92d4f62c2a9577', category: 'Podcasts', language: 'zh' },
  { name: '知行小酒馆', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6013f9f58e2f7ee375cf4216', category: 'Podcasts', language: 'zh' },
  { name: '纵横四海', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/62694abdb221dd5908417d1e', category: 'Podcasts', language: 'zh' },
  { name: '乱翻书', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/61358d971c5d56efe5bcb5d2', category: 'Podcasts', language: 'zh' },
  { name: 'OnBoard!', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/61cbaac48bb4cd867fcabe22', category: 'Podcasts', language: 'zh' },
  { name: '硬地骇客', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/640ee2438be5d40013fe4a87', category: 'Podcasts', language: 'zh' },
  { name: 'AI炼金术', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/63e9ef4de99bdef7d39944c8', category: 'Podcasts', language: 'zh' },
  { name: '人民公园说AI', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/65257ff6e8ce9deaf70a65e9', category: 'Podcasts', language: 'zh' },
  { name: '保持偏见', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/663e3c95af1e22bb157dcee3', category: 'Podcasts', language: 'zh' },
  { name: '枫言枫语', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e2864f5418a84a04628e249', category: 'Podcasts', language: 'zh' },
  { name: '屠龙之术', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6507bc165c88d2412626b401', category: 'Podcasts', language: 'zh' },
  { name: '晚点聊 LateTalk', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/61933ace1b4320461e91fd55', category: 'Podcasts', language: 'zh' },
  { name: '开始连接LinkStart', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/63ff0da51b1faf8a0b70b337', category: 'Podcasts', language: 'zh' },
  { name: '此话当真', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/646f194853a5e5ea1408d97c', category: 'Podcasts', language: 'zh' },
  { name: '跨国串门儿计划', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/670f3da40d2f24f28978736f', category: 'Podcasts', language: 'zh' },
  { name: '卫诗婕 | 商业漫谈Jane talk', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6627fda4b56459544087d86a', category: 'Podcasts', language: 'zh' },
  { name: '东腔西调', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5f72b66083c34e85dd14fde9', category: 'Podcasts', language: 'zh' },
  { name: '皮蛋漫游记', url: 'http://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6281264ad22bcf3950c80b56', category: 'Podcasts', language: 'zh' },
  { name: '奇想驿 by 产品沉思录', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6034daea97755b8fc9c66480', category: 'Podcasts', language: 'zh' },
  { name: '牛油果烤面包', url: 'http://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e7c8b2b418a84a046e3ecbc', category: 'Podcasts', language: 'zh' },
  { name: '半拿铁 | 商业沉浮录', url: 'http://rsshub.bestblogs.dev/xiaoyuzhou/podcast/62382c1103bea1ebfffa1c00', category: 'Podcasts', language: 'zh' },
  { name: '自习室 STUDY ROOM', url: 'http://rsshub.bestblogs.dev/xiaoyuzhou/podcast/65a5fb7540d4ef949c0140ac', category: 'Podcasts', language: 'zh' },
  { name: '天真不天真', url: 'http://rsshub.bestblogs.dev/xiaoyuzhou/podcast/65cef9e3cace72dff8d98de3', category: 'Podcasts', language: 'zh' },
  { name: '罗永浩的十字路口', url: 'https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/68981df29e7bcd326eb91d88', category: 'Podcasts', language: 'zh' },

  // Twitters from BestBlogs_RSS_Twitters.opml (160 sources)
  { name: 'OpenAI', url: 'https://api.xgo.ing/rss/user/0c0856a69f9f49cf961018c32a0b0049', category: 'Twitters', language: 'en' },
  { name: 'OpenAI Developers', url: 'https://api.xgo.ing/rss/user/971dc1fc90da449bac23e5fad8a33d55', category: 'Twitters', language: 'en' },
  { name: 'ChatGPT', url: 'https://api.xgo.ing/rss/user/f7992687b8d74b14bf2341eb3a0a5ec4', category: 'Twitters', language: 'en' },
  { name: 'Sam Altman', url: 'https://api.xgo.ing/rss/user/e30d4cd223f44bed9d404807105c8927', category: 'Twitters', language: 'en' },
  { name: 'Anthropic', url: 'https://api.xgo.ing/rss/user/fc28a211471b496682feff329ec616e5', category: 'Twitters', language: 'en' },
  { name: 'Dario Amodei', url: 'https://api.xgo.ing/rss/user/49666ce6fe3e4cb786c6574684542ec5', category: 'Twitters', language: 'en' },
  { name: 'Alex Albert', url: 'https://api.xgo.ing/rss/user/524525de0d69407b80f0a7d891fdc8df', category: 'Twitters', language: 'en' },
  { name: 'Greg Brockman', url: 'https://api.xgo.ing/rss/user/af19d054e26a49129f23abfa82d9e268', category: 'Twitters', language: 'en' },
  { name: 'Mike Krieger', url: 'https://api.xgo.ing/rss/user/78d7b99318b04b309b04000f7e24da29', category: 'Twitters', language: 'en' },
  { name: 'Kevin Weil', url: 'https://api.xgo.ing/rss/user/3ca3c7698fd04611a0e7d14fae93c84c', category: 'Twitters', language: 'en' },
  { name: 'Marc Andreessen', url: 'https://api.xgo.ing/rss/user/63316630d94543f5a6480f230f483008', category: 'Twitters', language: 'en' },
  { name: 'Microsoft Research', url: 'https://api.xgo.ing/rss/user/61f4b78554fb4b8fa5653ec5d924d15a', category: 'Twitters', language: 'en' },
  { name: 'Andrej Karpathy', url: 'https://api.xgo.ing/rss/user/edf707b5c0b248579085f66d7a3c5524', category: 'Twitters', language: 'en' },
  { name: 'Google AI', url: 'https://api.xgo.ing/rss/user/4de0bd2d5cef4333a0260dc8157054a7', category: 'Twitters', language: 'en' },
  { name: 'Yann LeCun', url: 'https://api.xgo.ing/rss/user/f5f4f928dede472ea55053672ad27ab6', category: 'Twitters', language: 'en' },
  { name: 'Anton Osika', url: 'https://api.xgo.ing/rss/user/5f13b32b124a41cfb659f903a84032b1', category: 'Twitters', language: 'en' },
  { name: 'Lovable', url: 'https://api.xgo.ing/rss/user/639cd13d44284e10ac89fbd1c5399767', category: 'Twitters', language: 'en' },
  { name: 'Fei-Fei Li', url: 'https://api.xgo.ing/rss/user/a4bfe44bfc0d4c949da21ebd3f5f42a5', category: 'Twitters', language: 'en' },
  { name: 'Amjad Masad', url: 'https://api.xgo.ing/rss/user/5fb1814c610c4af2911caa98c5c5ef82', category: 'Twitters', language: 'en' },
  { name: 'Replit', url: 'https://api.xgo.ing/rss/user/613f859e4bc440c5a28f40732840f5cf', category: 'Twitters', language: 'en' },
  { name: 'Clem', url: 'https://api.xgo.ing/rss/user/5dbd038a8f5140938d0877511571797b', category: 'Twitters', language: 'en' },
  { name: 'Hugging Face', url: 'https://api.xgo.ing/rss/user/fc16750ce50741f1b1f05ea1fb29436f', category: 'Twitters', language: 'en' },
  { name: 'Andrew Ng', url: 'https://api.xgo.ing/rss/user/08b5488b20bc437c8bfc317a52e5c26d', category: 'Twitters', language: 'en' },
  { name: 'DeepLearning.AI', url: 'https://api.xgo.ing/rss/user/42e6b4901b97498eab2ab64c07d56177', category: 'Twitters', language: 'en' },
  { name: 'Thomas Wolf', url: 'https://api.xgo.ing/rss/user/4918efb13c47459b8dcaa79cfdf72d09', category: 'Twitters', language: 'en' },
  { name: 'Logan Kilpatrick', url: 'https://api.xgo.ing/rss/user/4f63d960de644aeebd0aa97e4994dafe', category: 'Twitters', language: 'en' },
  { name: 'Lex Fridman', url: 'https://api.xgo.ing/rss/user/adf65931519340f795e2336910b4cd15', category: 'Twitters', language: 'en' },
  { name: 'Rowan Cheung', url: 'https://api.xgo.ing/rss/user/a636de3cbda0495daabd15b9fd298614', category: 'Twitters', language: 'en' },
  { name: '李继刚', url: 'https://api.xgo.ing/rss/user/ca2fa444b6ea4b8b974fe148056e497a', category: 'Twitters', language: 'zh' },
  { name: 'Demis Hassabis', url: 'https://api.xgo.ing/rss/user/4a884d5e2f3740c5a26c9c093de6388a', category: 'Twitters', language: 'en' },
  { name: 'bolt.new', url: 'https://api.xgo.ing/rss/user/760ab7cd9708452c9ce1f9144b92a430', category: 'Twitters', language: 'en' },
  { name: 'Mustafa Suleyman', url: 'https://api.xgo.ing/rss/user/394acfaff8c44e09936f5bc0b8504f2c', category: 'Twitters', language: 'en' },
  { name: 'Sualeh Asif', url: 'https://api.xgo.ing/rss/user/fafa6df3c67644b1a367a177240e0173', category: 'Twitters', language: 'en' },
  { name: 'Junyang Lin', url: 'https://api.xgo.ing/rss/user/082097117b4543e9a741cd2580f936d3', category: 'Twitters', language: 'en' },
  { name: 'Qwen', url: 'https://api.xgo.ing/rss/user/80032d016d654eb4afe741ff34b7643d', category: 'Twitters', language: 'en' },
  { name: 'Binyuan Hui', url: 'https://api.xgo.ing/rss/user/f54b2b40185943ce8f48a880110b7bc2', category: 'Twitters', language: 'en' },
  { name: 'Google DeepMind', url: 'https://api.xgo.ing/rss/user/a99538443a484fcc846bdcc8f50745ec', category: 'Twitters', language: 'en' },
  { name: 'NVIDIA AI', url: 'https://api.xgo.ing/rss/user/05f1492e43514dc3862a076d3697c390', category: 'Twitters', language: 'en' },
  { name: 'Ian Goodfellow', url: 'https://api.xgo.ing/rss/user/57831559d22440debbfb2f2528e4ba84', category: 'Twitters', language: 'en' },
  { name: 'Groq Inc', url: 'https://api.xgo.ing/rss/user/771b32075fe54a83bdb6966de9647b4f', category: 'Twitters', language: 'en' },
  { name: 'Berkeley AI Research', url: 'https://api.xgo.ing/rss/user/6bbf31cac345443585c3280320ba9009', category: 'Twitters', language: 'en' },
  { name: 'Jeff Dean', url: 'https://api.xgo.ing/rss/user/b1013166769c49f8aa3fbdc222867054', category: 'Twitters', language: 'en' },
  { name: 'Justine Moore', url: 'https://api.xgo.ing/rss/user/c61046471f174d86bc0eb76cb44a21c3', category: 'Twitters', language: 'en' },
  { name: 'Scott Wu', url: 'https://api.xgo.ing/rss/user/5fca8ccd87344d388bc863304ed6fd86', category: 'Twitters', language: 'en' },
  { name: 'Cognition', url: 'https://api.xgo.ing/rss/user/4cc14cbd15c74e189d537c415369e1a7', category: 'Twitters', language: 'en' },
  { name: 'Weaviate', url: 'https://api.xgo.ing/rss/user/2f1035ec6b28475987af06b600e1d04c', category: 'Twitters', language: 'en' },
  { name: 'Runway', url: 'https://api.xgo.ing/rss/user/e6bb4f612dd24db5bc1a6811e6dd5820', category: 'Twitters', language: 'en' },
  { name: 'AI at Meta', url: 'https://api.xgo.ing/rss/user/ef7c70f9568d45f4915169fef4ce90b4', category: 'Twitters', language: 'en' },
  { name: 'Stanford AI Lab', url: 'https://api.xgo.ing/rss/user/d5fc365556e641cba2278f501e8c6f92', category: 'Twitters', language: 'en' },
  { name: 'Geoffrey Hinton', url: 'https://api.xgo.ing/rss/user/cb6169815e2e447e8e6148a4af3f9686', category: 'Twitters', language: 'en' },
  { name: 'Patrick Loeber', url: 'https://api.xgo.ing/rss/user/c65c68f3713747bba863f92d6b5e996f', category: 'Twitters', language: 'en' },
  { name: 'Philipp Schmid', url: 'https://api.xgo.ing/rss/user/ce352bbf72e44033985bc756db2ee0e2', category: 'Twitters', language: 'en' },
  { name: 'Milvus', url: 'https://api.xgo.ing/rss/user/424e67b19eed4500b7a440976bbd2ade', category: 'Twitters', language: 'en' },
  { name: 'Jina AI', url: 'https://api.xgo.ing/rss/user/f510f6e7eecf456ca7e2895a46752888', category: 'Twitters', language: 'en' },
  { name: 'Justin Welsh', url: 'https://api.xgo.ing/rss/user/58894bf2934a426ca833c682da2bc810', category: 'Twitters', language: 'en' },
  { name: 'Midjourney', url: 'https://api.xgo.ing/rss/user/72dd496bfd9d44c5a5761a974630376d', category: 'Twitters', language: 'en' },
  { name: 'cohere', url: 'https://api.xgo.ing/rss/user/462aa134ed914f98b3491680ad9b36ed', category: 'Twitters', language: 'en' },
  { name: 'Qdrant', url: 'https://api.xgo.ing/rss/user/a55f6e33dd224235aabaabaaf9d58a06', category: 'Twitters', language: 'en' },
  { name: 'AI Engineer', url: 'https://api.xgo.ing/rss/user/7d19a619a1cc4a9896129211269d2c85', category: 'Twitters', language: 'en' },
  { name: 'Latent.Space', url: 'https://api.xgo.ing/rss/user/a7be8b61a1264ea7984abfaea3eff686', category: 'Twitters', language: 'en' },
  { name: 'Character.AI', url: 'https://api.xgo.ing/rss/user/3877c31cdb554cffb750b3b683c98c4d', category: 'Twitters', language: 'en' },
  { name: 'ElevenLabs', url: 'https://api.xgo.ing/rss/user/1897eed387064dfab443764d6da50bc6', category: 'Twitters', language: 'en' },
  { name: 'Taranjeet', url: 'https://api.xgo.ing/rss/user/2de92402f4a24c90bb27e7580b93a878', category: 'Twitters', language: 'en' },
  { name: 'mem0', url: 'https://api.xgo.ing/rss/user/94bb691baeff461686326af619beb116', category: 'Twitters', language: 'en' },
  { name: 'HeyGen', url: 'https://api.xgo.ing/rss/user/a9aff6b016c143ed8728dd86eb70d7db', category: 'Twitters', language: 'en' },
  { name: 'Paul Couvert', url: 'https://api.xgo.ing/rss/user/b9912ac9a29042cf8c834419dc44cb1f', category: 'Twitters', language: 'en' },
  { name: 'LangChain', url: 'https://api.xgo.ing/rss/user/862fee50a745423c87e2633b274caf1d', category: 'Twitters', language: 'en' },
  { name: 'Harrison Chase', url: 'https://api.xgo.ing/rss/user/f299207df53745bca04a03db8d11c5aa', category: 'Twitters', language: 'en' },
  { name: 'Recraft', url: 'https://api.xgo.ing/rss/user/acc648327c614d9b985b9fc3d737165b', category: 'Twitters', language: 'en' },
  { name: 'Perplexity', url: 'https://api.xgo.ing/rss/user/fdd601ea751949e7bec9e4cdad7c8e6c', category: 'Twitters', language: 'en' },
  { name: 'Aravind Srinivas', url: 'https://api.xgo.ing/rss/user/59e6b63ae9684d11be0ae13d9e7420f2', category: 'Twitters', language: 'en' },
  { name: 'LlamaIndex', url: 'https://api.xgo.ing/rss/user/67e259bd5be544ce84bbc867eace54c2', category: 'Twitters', language: 'en' },
  { name: 'Jerry Liu', url: 'https://api.xgo.ing/rss/user/b3d904c0d7c446558ef3a1e7f2eb362b', category: 'Twitters', language: 'en' },
  { name: 'Dify', url: 'https://api.xgo.ing/rss/user/0be252fedbe84ad7bea21be44b18da89', category: 'Twitters', language: 'en' },
  { name: 'Julien Chaumond', url: 'https://api.xgo.ing/rss/user/44d9fa384087448a94d3c8595f8d535e', category: 'Twitters', language: 'en' },
  { name: 'ollama', url: 'https://api.xgo.ing/rss/user/6326c63a2dfa445bbde88bea0c3112c2', category: 'Twitters', language: 'en' },
  { name: 'FlowiseAI', url: 'https://api.xgo.ing/rss/user/be74da51698d4cefb12b39830d6cd201', category: 'Twitters', language: 'en' },
  { name: 'Pika', url: 'https://api.xgo.ing/rss/user/3306d8b253ec4e03aca3c2e9967e7119', category: 'Twitters', language: 'en' },
  { name: 'xAI', url: 'https://api.xgo.ing/rss/user/3953aa71e87a422eb9d7bf6ff1c7c43e', category: 'Twitters', language: 'en' },
  { name: 'Ideogram', url: 'https://api.xgo.ing/rss/user/a719880fe66e4156a111187f50dae91b', category: 'Twitters', language: 'en' },
  { name: 'Mistral AI', url: 'https://api.xgo.ing/rss/user/8d2d03aea8af49818096da4ea00409d1', category: 'Twitters', language: 'en' },
  { name: 'OpenRouter', url: 'https://api.xgo.ing/rss/user/e503a90c035c4b1d8f8dd34907d15bf4', category: 'Twitters', language: 'en' },
  { name: 'v0', url: 'https://api.xgo.ing/rss/user/dbf37973e6fc4eae91d4be9669a78fc7', category: 'Twitters', language: 'en' },
  { name: 'AI SDK', url: 'https://api.xgo.ing/rss/user/22af005b21ec45b1a4503acca777b7f0', category: 'Twitters', language: 'en' },
  { name: 'Fish Audio', url: 'https://api.xgo.ing/rss/user/4900b3dcd592424687582ff9e0f148ea', category: 'Twitters', language: 'en' },
  { name: 'Hailuo AI', url: 'https://api.xgo.ing/rss/user/e65b5e59fcb544918c1ba17f5758f0f8', category: 'Twitters', language: 'en' },
  { name: 'Windsurf', url: 'https://api.xgo.ing/rss/user/4a8273800ed34a069eecdb6c5c1b9ccf', category: 'Twitters', language: 'en' },
  { name: 'Varun Mohan', url: 'https://api.xgo.ing/rss/user/7794c4268a504019a94af1778857a703', category: 'Twitters', language: 'en' },
  { name: '宝玉', url: 'https://api.xgo.ing/rss/user/97f1484ae48c430fbbf3438099743674', category: 'Twitters', language: 'zh' },
  { name: 'ManusAI', url: 'https://api.xgo.ing/rss/user/320181c4651a41a08015946b55f704ab', category: 'Twitters', language: 'en' },
  { name: 'AK', url: 'https://api.xgo.ing/rss/user/341f7b9f8d9b477e8bb200caa7f32c6e', category: 'Twitters', language: 'en' },
  { name: 'LovartAI', url: 'https://api.xgo.ing/rss/user/db648e4d4eae4822aa0d34f0faef7ad2', category: 'Twitters', language: 'en' },
  { name: 'Figma', url: 'https://api.xgo.ing/rss/user/f8a106a09a7d404fb8de7eb0c5ddd2a2', category: 'Twitters', language: 'en' },
  { name: 'Cursor', url: 'https://api.xgo.ing/rss/user/5287b4e0e13a4ab7ab7b1d56f9d88960', category: 'Twitters', language: 'en' },
  { name: 'Aman Sanger', url: 'https://api.xgo.ing/rss/user/a02496979a0e4d86baf2b72c24db52a4', category: 'Twitters', language: 'en' },
  { name: 'Satya Nadella', url: 'https://api.xgo.ing/rss/user/baa68dbd9a9e461a96fd9b2e3f35dcbf', category: 'Twitters', language: 'en' },
  { name: 'Genspark', url: 'https://api.xgo.ing/rss/user/71ffd342cb5d478185ef7d55bdfca011', category: 'Twitters', language: 'en' },
  { name: 'Barsee', url: 'https://api.xgo.ing/rss/user/244eb9fa77ce4fa3b7fa5ceba80027a4', category: 'Twitters', language: 'en' },
  { name: 'Hunyuan', url: 'https://api.xgo.ing/rss/user/6e8e7b42cb434818810f87bcf77d86fb', category: 'Twitters', language: 'en' },
  { name: 'NotebookLM', url: 'https://api.xgo.ing/rss/user/221a88341acb475db221a12fed8208d0', category: 'Twitters', language: 'en' },
  { name: 'Google AI Developers', url: 'https://api.xgo.ing/rss/user/69d925d4a8d44221b03eecbe07bd0f74', category: 'Twitters', language: 'en' },
  { name: 'Sundar Pichai', url: 'https://api.xgo.ing/rss/user/8324d65a63dc42c584a8c08cc8323c9f', category: 'Twitters', language: 'en' },
  { name: 'Google Gemini App', url: 'https://api.xgo.ing/rss/user/6fb337feeec44ca38b79491b971d868d', category: 'Twitters', language: 'en' },
  { name: 'Eric Jing', url: 'https://api.xgo.ing/rss/user/ddfdcdd4e390495c942f0b5da62af0fb', category: 'Twitters', language: 'en' },
  { name: 'Lenny Rachitsky', url: 'https://api.xgo.ing/rss/user/77d5ce4736854b0ebae603e4b54d3095', category: 'Twitters', language: 'en' },
  { name: 'Jim Fan', url: 'https://api.xgo.ing/rss/user/c6cfe7c0d6b74849997073233fdea840', category: 'Twitters', language: 'en' },
  { name: 'Notion', url: 'https://api.xgo.ing/rss/user/f97a26863aec4425b021720d4f8e4ede', category: 'Twitters', language: 'en' },
  { name: 'AI Breakfast', url: 'https://api.xgo.ing/rss/user/0e3ebaf288014c45b0d24b71fe37312b', category: 'Twitters', language: 'en' },
  { name: 'DeepSeek', url: 'https://api.xgo.ing/rss/user/68b610deb24b47ae9a236811563cda86', category: 'Twitters', language: 'en' },
  { name: '歸藏', url: 'https://api.xgo.ing/rss/user/831fac36aa0a49a9af79f35dc1c9b5d9', category: 'Twitters', language: 'zh' },
  { name: 'Dia', url: 'https://api.xgo.ing/rss/user/6384ee3c656c48fea5e8b3cdacece4d0', category: 'Twitters', language: 'en' },
  { name: 'Skywork', url: 'https://api.xgo.ing/rss/user/6d7d398dd80b48d79669c92745d32cf6', category: 'Twitters', language: 'en' },
  { name: 'Naval', url: 'https://api.xgo.ing/rss/user/b43bc203409e4c5a9c3ae86fe1ac00c9', category: 'Twitters', language: 'en' },
  { name: 'Aadit Sheth', url: 'https://api.xgo.ing/rss/user/179bcc4b8e5d4274b6e9e935f9fd4434', category: 'Twitters', language: 'en' },
  { name: '小互', url: 'https://api.xgo.ing/rss/user/74e542992cf7441390c708f5601071d4', category: 'Twitters', language: 'zh' },
  { name: 'cat', url: 'https://api.xgo.ing/rss/user/66a6b39ddcfa42e39621e0ab293c1bdd', category: 'Twitters', language: 'en' },
  { name: 'Augment Code', url: 'https://api.xgo.ing/rss/user/e153fdd077df458b8298d975c060dcc3', category: 'Twitters', language: 'en' },
  { name: '向阳乔木', url: 'https://api.xgo.ing/rss/user/9de19c78f7454ad08c956c1a00d237fe', category: 'Twitters', language: 'zh' },
  { name: 'Fellou', url: 'https://api.xgo.ing/rss/user/326763c2f6154826babcfd71c5ab0f70', category: 'Twitters', language: 'en' },
  { name: 'Kling AI', url: 'https://api.xgo.ing/rss/user/564237c3de274d58a04f064920817888', category: 'Twitters', language: 'en' },
  { name: 'Firecrawl', url: 'https://api.xgo.ing/rss/user/c04abb206bbf4f91b22795024d6c0614', category: 'Twitters', language: 'en' },
  { name: 'Poe', url: 'https://api.xgo.ing/rss/user/17687b1051204b2dbaed4ea4c9178f28', category: 'Twitters', language: 'en' },
  { name: 'lmarena.ai', url: 'https://api.xgo.ing/rss/user/f01b088d5a39473e854b07143df77ec5', category: 'Twitters', language: 'en' },
  { name: 'Replicate', url: 'https://api.xgo.ing/rss/user/12eba9c3db4940c5ab2a72bd00f9ff2c', category: 'Twitters', language: 'en' },
  { name: 'a16z', url: 'https://api.xgo.ing/rss/user/f3fedf817599470dbf8d8d11f0872475', category: 'Twitters', language: 'en' },
  { name: 'Y Combinator', url: 'https://api.xgo.ing/rss/user/b1ab109f6afd42ab8ea32e17a19a3a3e', category: 'Twitters', language: 'en' },
  { name: 'Lilian Weng', url: 'https://api.xgo.ing/rss/user/a8f7e2238039461cbc8bf55f5f194498', category: 'Twitters', language: 'en' },
  { name: 'Paul Graham', url: 'https://api.xgo.ing/rss/user/900549ddadf04e839d3f7a17ebaba3fc', category: 'Twitters', language: 'en' },
  { name: 'Guillermo Rauch', url: 'https://api.xgo.ing/rss/user/e8750659b8154dbfa0489f451e044af1', category: 'Twitters', language: 'en' },
  { name: 'andrew chen', url: 'https://api.xgo.ing/rss/user/a3eb6beb2d894da3a9b7ab6d2e46790e', category: 'Twitters', language: 'en' },
  { name: 'Arthur Mensch', url: 'https://api.xgo.ing/rss/user/d8121d969fb34c7daad2dd2aac4ba270', category: 'Twitters', language: 'en' },
  { name: 'Simon Willison', url: 'https://api.xgo.ing/rss/user/30ad80be93c84e44acc37d5ddf31db57', category: 'Twitters', language: 'en' },
  { name: 'Browser Use', url: 'https://api.xgo.ing/rss/user/b8d7530f0b294405825013bbc1cc198f', category: 'Twitters', language: 'en' },
  { name: 'AI Will', url: 'https://api.xgo.ing/rss/user/aa74321087f9405a872fd9a76b743bf8', category: 'Twitters', language: 'en' },
  { name: 'Ray Dalio', url: 'https://api.xgo.ing/rss/user/4838204097ed422eac24ad48e68dc3ff', category: 'Twitters', language: 'en' },
  { name: 'Sahil Lavingia', url: 'https://api.xgo.ing/rss/user/baad3713defe4182844d2756b4c2c9ed', category: 'Twitters', language: 'en' },
  { name: 'elvis', url: 'https://api.xgo.ing/rss/user/931d6e88e067496cac6bf23f69d60f33', category: 'Twitters', language: 'en' },
  { name: 'The Rundown AI', url: 'https://api.xgo.ing/rss/user/83b1ea38940b4a1d81ea57d1ffb12ad7', category: 'Twitters', language: 'en' },
  { name: 'Nick St. Pierre', url: 'https://api.xgo.ing/rss/user/6ebdf0d91eef4c149acd0ef110635866', category: 'Twitters', language: 'en' },
  { name: 'Monica', url: 'https://api.xgo.ing/rss/user/5d749cc613ec4069bb2a47334739e1b6', category: 'Twitters', language: 'en' },
  { name: 'Fireworks AI', url: 'https://api.xgo.ing/rss/user/9f35c76341554bd78c2b9e63dc4fa5d8', category: 'Twitters', language: 'en' },
  { name: 'meng shao', url: 'https://api.xgo.ing/rss/user/48aae530e0bf413aa7d44380f418e2e3', category: 'Twitters', language: 'en' },
  { name: 'Jan Leike', url: 'https://api.xgo.ing/rss/user/dceb5cd131b34c72a8376cba8ea5d864', category: 'Twitters', language: 'en' },
  { name: 'Richard Socher', url: 'https://api.xgo.ing/rss/user/4d2d4165a7524217a08d3f57f27fa190', category: 'Twitters', language: 'en' },
  { name: 'Gary Marcus', url: 'https://api.xgo.ing/rss/user/35a38c5646d946fb894d8c30c1d9629e', category: 'Twitters', language: 'en' },
  { name: 'Adam DAngelo', url: 'https://api.xgo.ing/rss/user/3042b6f912b24f64982cc23f7bd59681', category: 'Twitters', language: 'en' },
  { name: 'Suhail', url: 'https://api.xgo.ing/rss/user/c961547e08df4396b3ab69367a07a1cd', category: 'Twitters', language: 'en' },
  { name: 'AI产品黄叔', url: 'https://api.xgo.ing/rss/user/5b632b7fba274f62928cdcc9d3db4c5e', category: 'Twitters', language: 'zh' },
  { name: 'GitHub', url: 'https://api.xgo.ing/rss/user/fa5b15f68a2e4df1ab301e26a4ab9190', category: 'Twitters', language: 'en' },
  { name: 'idoubi', url: 'https://api.xgo.ing/rss/user/3d72acd51d21414ea39871fc01982a65', category: 'Twitters', language: 'zh' },
  { name: 'Claude', url: 'https://api.xgo.ing/rss/user/01f60d63a61b44d692cc35c7feb0b4a4', category: 'Twitters', language: 'en' },
  { name: 'Martin Fowler', url: 'https://api.xgo.ing/rss/user/55d2d3f3eaaf4357b3230e0b01a464d7', category: 'Twitters', language: 'en' },
  { name: 'Viking', url: 'https://api.xgo.ing/rss/user/aab44cb2665a49258cd81f63b0b55192', category: 'Twitters', language: 'en' },
  { name: 'Geek', url: 'https://api.xgo.ing/rss/user/9cb3b60e689e4445a7fbdfd0be144126', category: 'Twitters', language: 'zh' },
  { name: 'Tw93', url: 'https://api.xgo.ing/rss/user/665fc88440fd4436acbc2e630d824926', category: 'Twitters', language: 'zh' },
  { name: 'Yangyi', url: 'https://api.xgo.ing/rss/user/66c40de71a9842fda4853b7d9d1d20da', category: 'Twitters', language: 'zh' },
  { name: 'hidecloud', url: 'https://api.xgo.ing/rss/user/23d41992b29340788aa3d09d8364c5f5', category: 'Twitters', language: 'en' },

  // Videos from BestBlogs_RSS_Videos.opml (41 sources)
  { name: 'Anthropic', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCrDwWp7EBBv4NwvScIpBDOA', category: 'Videos', language: 'en' },
  { name: 'AI Engineer', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLKPca3kwwd-B59HNr-_lvA', category: 'Videos', language: 'en' },
  { name: 'No Priors', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCSI7h9hydQ40K5MJHnCrQvw', category: 'Videos', language: 'en' },
  { name: 'OpenAI', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A', category: 'Videos', language: 'en' },
  { name: 'Google DeepMind', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCP7jMXSY2xbc3KCAE0MHQ-A', category: 'Videos', language: 'en' },
  { name: 'leerob', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZMli3czZnd1uoc1ShTouQw', category: 'Videos', language: 'en' },
  { name: 'Y Combinator', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCcefcZRL2oaA_uBNeo5UOWg', category: 'Videos', language: 'en' },
  { name: 'Lenny Podcast', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6t1O76G0jYXOAoYCm153dA', category: 'Videos', language: 'en' },
  { name: 'Sequoia Capital', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWrF0oN6unbXrWsTN7RctTw', category: 'Videos', language: 'en' },
  { name: 'Stripe', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCM1guA1E-RHLO2OyfQPOkEQ', category: 'Videos', language: 'en' },
  { name: 'Fireship', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA', category: 'Videos', language: 'en' },
  { name: 'Spring I/O', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLMPXsvSrhNPN3i9h-u8PYg', category: 'Videos', language: 'en' },
  { name: 'Dwarkesh Patel', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXl4i9dYBrFOabk0xGmbkRA', category: 'Videos', language: 'en' },
  { name: 'Lex Fridman', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCSHZKyawb77ixDdsGog4iWA', category: 'Videos', language: 'en' },
  { name: 'Hung-yi Lee', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2ggjtuuWvxrHHHiaDH1dlQ', category: 'Videos', language: 'en' },
  { name: 'a16z', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC9cn0TuPq4dnbTY-CBsm8XA', category: 'Videos', language: 'en' },
  { name: 'The Diary Of A CEO Clips', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCnjgxChqYYnyoqO4k_Q1d6Q', category: 'Videos', language: 'en' },
  { name: 'AI Master', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0yHbz4OxdQFwmVX2BBQqLg', category: 'Videos', language: 'en' },
  { name: 'Matt Wolfe', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UChpleBmo18P08aKCIgti38g', category: 'Videos', language: 'en' },
  { name: 'AICodeKing', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UChmpleBmo18P08aKCIgti38g', category: 'Videos', language: 'en' },
  { name: 'Liam Ottley', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCui4jxDaMb53Gdh-AZUTPAg', category: 'Videos', language: 'en' },
  { name: 'Wes Roth', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqcbQf6yw5KzRoDDcZ_wBSw', category: 'Videos', language: 'en' },
  { name: 'Andrej Karpathy', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXUPKJO5MZQN11PqgIvyuvQ', category: 'Videos', language: 'en' },
  { name: 'Jason West', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCQ-rZd0NpjXYTpB3y5BNxPw', category: 'Videos', language: 'en' },
  { name: 'Greg Isenberg', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCPjNBjflYl0-HQtUvOx0Ibw', category: 'Videos', language: 'en' },
  { name: 'My First Million', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCyaN6mg5u8Cjy2ZI4ikWaug', category: 'Videos', language: 'en' },
  { name: 'Riley Brown', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCMcoud_ZW7cfxeIugBflSBw', category: 'Videos', language: 'en' },
  { name: 'Tina Huang', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2UXDak6o7rBm23k3Vv5dww', category: 'Videos', language: 'en' },
  { name: 'Last Week in AI', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKARTq-t5SPMzwtft8FWwnA', category: 'Videos', language: 'en' },
  { name: 'All-In Podcast', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCESLZhusAkFfsNsApnjF_Cg', category: 'Videos', language: 'en' },
  { name: 'AI Explained', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw', category: 'Videos', language: 'en' },
  { name: 'Two Minute Papers', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg', category: 'Videos', language: 'en' },
  { name: 'Matthew Berman', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCawZsQWqfGSbCI5yjkdVkTA', category: 'Videos', language: 'en' },
  { name: 'freeCodeCamp.org', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC8butISFwT-Wl7EV0hUK0BQ', category: 'Videos', language: 'en' },
  { name: 'ByteByteGo', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZgt6AzoyjslHTC9dz0UoTw', category: 'Videos', language: 'en' },
  { name: 'Product School', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6hlQ0x6kPbAGjYkoz53cvA', category: 'Videos', language: 'en' },
  { name: 'yobi321', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCB_DbqNN9w30tnyWJSrIwyA', category: 'Videos', language: 'en' },
  { name: 'TED', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCAuUUnT6oDeKwE6v1NGQxug', category: 'Videos', language: 'en' },
  { name: 'LangChain', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCC-lyoTfSrcJzA1ab3APAgw', category: 'Videos', language: 'en' },
  { name: 'Siraj Raval', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWN3xxRkmTPmbKwht9FuE5A', category: 'Videos', language: 'en' },
];

// Detect language from source name or URL
function detectLanguage(name: string, url: string): 'en' | 'zh' | 'ja' | 'ko' {
  const lowerName = name.toLowerCase();
  const lowerUrl = url.toLowerCase();

  // Check if name contains Chinese characters
  const chineseRegex = /[\u4e00-\u9fff]/;
  if (chineseRegex.test(name)) return 'zh';

  // Check if URL contains Chinese domain or path
  if (chineseRegex.test(url)) return 'zh';

  // Check if name contains Japanese characters
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  if (japaneseRegex.test(name)) return 'ja';

  // Check if name contains Korean characters
  const koreanRegex = /[\uac00-\ud7af]/;
  if (koreanRegex.test(name) || koreanRegex.test(url)) return 'ko';

  // Check for common Chinese source name patterns
  const chineseNames = [
    '量子位', '机器之心', '腾讯', '爱范儿', '极客公园', '虎嗅', '36氪',
    '钛媒体', '品玩', '硅星人', '脑极羊', '将门创投', ' resumes',
    'infoq', 'segmentfault', 'cocoachina', 'oschina', 'cnblogs',
    'juejin', 'zhihu', 'weibo', 'tencent', 'aliyun', 'baidu'
  ];
  if (chineseNames.some(n => lowerName.includes(n.toLowerCase()))) return 'zh';

  // Check URL for Chinese platforms
  const chineseUrls = ['wechat', 'qq.com', 'baidu.com', 'aliyun.com', 'tencent.com',
    'zhihu.com', 'juejin.cn', 'segmentfault.com', 'cocoachina.com', 'oschina.net'];
  if (chineseUrls.some(u => lowerUrl.includes(u))) return 'zh';

  // Check for common Japanese source patterns
  const japaneseNames = ['技術', 'テクノロジー', ' Tech', 'Gihyo', 'Postd'];
  if (japaneseNames.some(n => name.includes(n))) return 'ja';

  // Default to English
  return 'en';
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Import RSS sources from OPML or default sources
 * POST body: { opmlPath?, category?, importDefault? }
 * - importDefault: use default sources (hardcoded)
 * - opmlPath: read and parse OPML file
 *
 * GET: List default sources
 */
export async function GET() {
  return NextResponse.json({
    message: 'Default RSS sources',
    sources: DEFAULT_SOURCES.map(s => ({
      name: s.name,
      url: s.url,
      category: s.category,
      language: s.language,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { opmlPath, category, importDefault } = body;

    // Explicitly convert to boolean to handle "true" string or undefined
    const isImportDefault = Boolean(importDefault);

    console.log('[import-opml] Request:', { opmlPath, category, importDefault: isImportDefault });

    // If importDefault is true, use default sources - MUST return early
    if (isImportDefault) {
      console.log('[import-opml] Using DEFAULT_SOURCES, category:', category);
      const categoryFilter = category || 'Articles';
      const sourcesToImport = DEFAULT_SOURCES.filter(s => s.category === categoryFilter);

      if (sourcesToImport.length === 0) {
        return NextResponse.json({
          message: `No sources found for category: ${categoryFilter}`,
          imported: 0,
          skipped: 0,
          results: [],
        });
      }

      let imported = 0;
      let skipped = 0;
      const results: Array<{
        name: string;
        url: string;
        status: 'imported' | 'skipped' | 'error';
        message?: string;
      }> = [];

      for (const source of sourcesToImport) {
        try {
          // Check if source already exists by URL
          let existingSources;
          try {
            existingSources = await getAllRssSources();
            console.log('[import-opml] Got existing sources:', existingSources.length);
          } catch (dbErr: any) {
            console.error('[import-opml] Error getting existing sources:', dbErr);
            results.push({
              name: source.name,
              url: source.url,
              status: 'error',
              message: 'Database error: ' + dbErr.message,
            });
            skipped++;
            continue;
          }
          const exists = existingSources.some(s => s.url === source.url);

          if (exists) {
            results.push({
              name: source.name,
              url: source.url,
              status: 'skipped',
              message: 'Already exists',
            });
            skipped++;
            continue;
          }

          let newSource;
          try {
            newSource = await addRssSource({
              id: uuidv4(),
              name: source.name,
              url: source.url,
              category: source.category,
              language: source.language,
              enabled: true,
            });
            console.log('[import-opml] Added source:', source.name, newSource ? 'success' : 'failed');
          } catch (addErr: any) {
            console.error('[import-opml] Error adding source:', addErr);
            results.push({
              name: source.name,
              url: source.url,
              status: 'error',
              message: 'Failed to add: ' + addErr.message,
            });
            skipped++;
            continue;
          }

          if (newSource) {
            results.push({
              name: newSource.name,
              url: newSource.url,
              status: 'imported',
            });
            imported++;
          } else {
            results.push({
              name: source.name,
              url: source.url,
              status: 'error',
              message: 'Failed to add source',
            });
            skipped++;
          }
        } catch (err: any) {
          results.push({
            name: source.name,
            url: source.url,
            status: 'error',
            message: err.message || 'Failed to import',
          });
          skipped++;
        }
      }

      return NextResponse.json({
        message: `Imported default sources (${categoryFilter})`,
        imported,
        skipped,
        results,
      });
    }

    // If opmlPath provided, read and parse OPML file
    if (opmlPath) {
      const fullPath = opmlPath.startsWith('/')
        ? opmlPath
        : `${process.cwd()}/${opmlPath}`;

      try {
        const opmlContent = await fs.readFile(fullPath, 'utf-8');
        const outlines = parseOpml(opmlContent);

        if (outlines.length === 0) {
          return NextResponse.json({
            message: 'No RSS feeds found in OPML file',
            imported: 0,
            skipped: 0,
            results: [],
          });
        }

        let imported = 0;
        let skipped = 0;
        const results: Array<{
          name: string;
          url: string;
          status: 'imported' | 'skipped' | 'error';
          message?: string;
        }> = [];

        // Get existing sources to check for duplicates
        const existingSources = await getAllRssSources();
        const existingUrls = new Set(existingSources.map(s => s.url));

        for (const outline of outlines) {
          const sourceName = outline.title || outline.text || 'Unknown';
          const sourceUrl = outline.xmlUrl;

          if (!sourceUrl) continue;

          try {
            if (existingUrls.has(sourceUrl)) {
              results.push({
                name: sourceName,
                url: sourceUrl,
                status: 'skipped',
                message: 'Already exists',
              });
              skipped++;
              continue;
            }

            const newSource = await addRssSource({
              id: uuidv4(),
              name: sourceName,
              url: sourceUrl,
              category: category || 'Articles',
              language: detectLanguage(sourceName, sourceUrl),
              enabled: true,
            });

            if (newSource) {
              results.push({
                name: newSource.name,
                url: newSource.url,
                status: 'imported',
              });
              imported++;
            } else {
              results.push({
                name: sourceName,
                url: sourceUrl,
                status: 'error',
                message: 'Failed to add source',
              });
              skipped++;
            }
            existingUrls.add(sourceUrl); // Add to set to prevent duplicates within same import
          } catch (err: any) {
            results.push({
              name: sourceName,
              url: sourceUrl,
              status: 'error',
              message: err.message || 'Failed to import',
            });
            skipped++;
          }
        }

        return NextResponse.json({
          message: `Imported from OPML: ${fullPath}`,
          imported,
          skipped,
          total: outlines.length,
          results,
        });
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return NextResponse.json(
            { error: `OPML file not found: ${fullPath}` },
            { status: 404 }
          );
        }
        throw err;
      }
    }

    // If neither importDefault nor opmlPath provided, return error
    return NextResponse.json(
      { error: 'Please provide either importDefault: true or opmlPath' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Failed to import OPML:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to import OPML' },
      { status: 500 }
    );
  }
}
