// tina/config.ts
import { defineConfig } from "tinacms";

// src/lib/categories.ts
var TUTORIAL_CATEGORIES = [
  { id: "frameworks", value: "Frameworks", i18nKey: "frameworks", icon: "grid" },
  { id: "llms", value: "LLM Models", i18nKey: "llms", icon: "cpu" },
  { id: "workflows", value: "Agentic Workflows", i18nKey: "workflows", icon: "git-merge" },
  { id: "cases", value: "Real-world Cases", i18nKey: "cases", icon: "briefcase" },
  { id: "rag", value: "RAG", i18nKey: "rag", icon: "database" },
  { id: "prompting", value: "Prompting", i18nKey: "prompting", icon: "message-square" }
];
var categoryValueToId = Object.fromEntries(
  TUTORIAL_CATEGORIES.map((c) => [c.value, c.id])
);
var categoryIdToValue = Object.fromEntries(
  TUTORIAL_CATEGORIES.map((c) => [c.id, c.value])
);
var CATEGORY_OPTIONS = TUTORIAL_CATEGORIES.map((c) => c.value);

// src/lib/tool-categories.ts
var TOOL_CATEGORIES = [
  { id: "llm-framework", value: "LLM Framework", i18nKey: "llmFramework", icon: "bot" },
  { id: "vector-db", value: "Vector Database", i18nKey: "vectorDb", icon: "database" },
  { id: "agent-framework", value: "Agent Framework", i18nKey: "agentFramework", icon: "workflow" },
  { id: "embedding", value: "Embedding", i18nKey: "embedding", icon: "layers" },
  { id: "monitoring", value: "Monitoring", i18nKey: "monitoring", icon: "activity" },
  { id: "ide-editor", value: "IDE/Editor", i18nKey: "ideEditor", icon: "code" },
  { id: "deployment", value: "Deployment", i18nKey: "deployment", icon: "rocket" },
  { id: "prompt-engineering", value: "Prompt Engineering", i18nKey: "promptEngineering", icon: "pen-tool" },
  { id: "data-processing", value: "Data Processing", i18nKey: "dataProcessing", icon: "filter" },
  { id: "testing", value: "Testing", i18nKey: "testing", icon: "check-circle" },
  { id: "other", value: "Other", i18nKey: "other", icon: "package" }
];
var toolCategoryValueToId = Object.fromEntries(
  TOOL_CATEGORIES.map((c) => [c.value, c.id])
);
var toolCategoryIdToValue = Object.fromEntries(
  TOOL_CATEGORIES.map((c) => [c.id, c.value])
);
var TOOL_CATEGORY_OPTIONS = TOOL_CATEGORIES.map((c) => c.value);

// tina/config.ts
var config_default = defineConfig({
  branch: process.env.TINA_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main",
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",
  build: {
    outputFolder: "admin",
    publicFolder: "public"
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public"
    }
  },
  schema: {
    collections: [
      {
        name: "tutorial",
        label: "Tutorials",
        path: "content/tutorials",
        format: "mdx",
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              const locale = values?.locale || "en";
              const slug = values?.slug || (values?.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
              return `${locale}/${slug}`;
            }
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            required: true,
            isTitle: true
          },
          {
            type: "string",
            name: "slug",
            label: "Slug",
            required: true
          },
          {
            type: "string",
            name: "locale",
            label: "Locale",
            required: true,
            options: ["en", "zh", "ja"]
          },
          {
            type: "string",
            name: "description",
            label: "Description",
            required: true,
            ui: { component: "textarea" }
          },
          {
            type: "string",
            name: "category",
            label: "Category",
            required: true,
            options: CATEGORY_OPTIONS
          },
          {
            type: "string",
            name: "tags",
            label: "Tags",
            list: true
          },
          {
            type: "string",
            name: "techStack",
            label: "Tech Stack",
            list: true
          },
          {
            type: "string",
            name: "difficulty",
            label: "Difficulty",
            options: ["Beginner", "Intermediate", "Advanced"]
          },
          {
            type: "string",
            name: "duration",
            label: "Duration"
          },
          {
            type: "string",
            name: "videoUrl",
            label: "Video URL"
          },
          {
            type: "image",
            name: "thumbnail",
            label: "Thumbnail"
          },
          {
            type: "boolean",
            name: "featured",
            label: "Featured"
          },
          {
            type: "datetime",
            name: "date",
            label: "Date",
            required: true
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true
          }
        ]
      },
      {
        name: "doc",
        label: "Documentation",
        path: "content/docs",
        format: "mdx",
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              const locale = values?.locale || "en";
              const slug = values?.slug || (values?.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
              return `${locale}/${slug}`;
            }
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            required: true,
            isTitle: true
          },
          {
            type: "string",
            name: "slug",
            label: "Slug",
            required: true
          },
          {
            type: "string",
            name: "locale",
            label: "Locale",
            required: true,
            options: ["en", "zh", "ja"]
          },
          {
            type: "string",
            name: "category",
            label: "Category",
            required: true,
            options: ["Introduction", "Core Concepts", "API", "Guides"]
          },
          {
            type: "number",
            name: "order",
            label: "Sort Order"
          },
          {
            type: "datetime",
            name: "lastUpdated",
            label: "Last Updated"
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true
          }
        ]
      },
      {
        name: "news",
        label: "News Articles",
        path: "content/news",
        format: "mdx",
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              const locale = values?.locale || "en";
              const slug = values?.slug || (values?.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
              return `${locale}/${slug}`;
            }
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            required: true,
            isTitle: true
          },
          {
            type: "string",
            name: "slug",
            label: "Slug",
            required: true
          },
          {
            type: "string",
            name: "locale",
            label: "Locale",
            required: true,
            options: ["en", "zh", "ja"]
          },
          {
            type: "string",
            name: "summary",
            label: "Summary",
            required: true,
            ui: { component: "textarea" }
          },
          {
            type: "string",
            name: "source",
            label: "Source",
            required: true
          },
          {
            type: "string",
            name: "sourceUrl",
            label: "Source URL"
          },
          {
            type: "string",
            name: "author",
            label: "Author"
          },
          {
            type: "image",
            name: "imageUrl",
            label: "Image"
          },
          {
            type: "datetime",
            name: "publishedAt",
            label: "Published At",
            required: true
          },
          {
            type: "string",
            name: "category",
            label: "Category",
            options: ["Tech", "Research", "Industry"]
          },
          {
            type: "string",
            name: "readTime",
            label: "Read Time"
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true
          }
        ]
      },
      {
        name: "practiceLab",
        label: "Practice Labs",
        path: "content/labs",
        format: "json",
        match: {
          include: "{en,zh,ja}/*"
        },
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              const locale = values?.locale || "en";
              const slug = (values?.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
              return `${locale}/${slug}`;
            }
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            required: true,
            isTitle: true
          },
          {
            type: "string",
            name: "locale",
            label: "Locale",
            required: true,
            options: ["en", "zh", "ja"]
          },
          {
            type: "string",
            name: "description",
            label: "Description",
            required: true,
            ui: { component: "textarea" }
          },
          {
            type: "string",
            name: "environment",
            label: "Environment",
            options: ["Python", "Node.js", "Go"]
          },
          {
            type: "string",
            name: "difficulty",
            label: "Difficulty",
            options: ["Beginner", "Intermediate", "Advanced"]
          },
          {
            type: "string",
            name: "status",
            label: "Status",
            options: ["Online", "Maintenance"]
          },
          {
            type: "number",
            name: "usersOnline",
            label: "Users Online"
          },
          {
            type: "image",
            name: "thumbnail",
            label: "Thumbnail"
          },
          {
            type: "string",
            name: "launchUrl",
            label: "Launch URL",
            description: "URL for the sandbox environment (external link or iframe src)"
          },
          {
            type: "string",
            name: "launchMode",
            label: "Launch Mode",
            description: "How the sandbox opens: external (new tab) or iframe (embedded)",
            options: ["external", "iframe"]
          }
        ]
      },
      {
        name: "showcase",
        label: "Showcase Projects",
        path: "content/showcase",
        format: "mdx",
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              const locale = values?.locale || "en";
              const slug = values?.slug || (values?.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
              return `${locale}/${slug}`;
            }
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            required: true,
            isTitle: true
          },
          {
            type: "string",
            name: "slug",
            label: "Slug",
            required: true
          },
          {
            type: "string",
            name: "locale",
            label: "Locale",
            required: true,
            options: ["en", "zh", "ja"]
          },
          {
            type: "string",
            name: "contentType",
            label: "Content Type",
            required: true,
            options: ["card", "detailed"],
            description: "Card: Simple project card | Detailed: Full case study with MDX content"
          },
          {
            type: "object",
            name: "author",
            label: "Author",
            fields: [
              {
                type: "string",
                name: "name",
                label: "Name",
                required: true
              },
              {
                type: "image",
                name: "avatar",
                label: "Avatar"
              }
            ]
          },
          {
            type: "string",
            name: "description",
            label: "Description",
            required: true,
            ui: { component: "textarea" }
          },
          {
            type: "string",
            name: "tags",
            label: "Tags",
            list: true
          },
          {
            type: "number",
            name: "stars",
            label: "Stars"
          },
          {
            type: "string",
            name: "demoUrl",
            label: "Demo URL"
          },
          {
            type: "string",
            name: "videoUrl",
            label: "Video URL (YouTube, etc.)",
            description: "Full URL to embedded video for detailed pages"
          },
          {
            type: "string",
            name: "repoUrl",
            label: "Repo URL"
          },
          {
            type: "string",
            name: "websiteUrl",
            label: "Website / Product URL",
            description: "Link to a landing page, product page, or external website"
          },
          {
            type: "image",
            name: "thumbnail",
            label: "Thumbnail"
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true
          }
        ]
      },
      {
        name: "tool",
        label: "Tools",
        path: "content/tools",
        format: "mdx",
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              const locale = values?.locale || "en";
              const slug = values?.slug || (values?.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
              return `${locale}/${slug}`;
            }
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            required: true,
            isTitle: true
          },
          {
            type: "string",
            name: "slug",
            label: "Slug",
            required: true
          },
          {
            type: "string",
            name: "locale",
            label: "Locale",
            required: true,
            options: ["en", "zh", "ja"]
          },
          {
            type: "string",
            name: "description",
            label: "Description",
            required: true,
            ui: { component: "textarea" }
          },
          {
            type: "string",
            name: "category",
            label: "Category",
            required: true,
            options: TOOL_CATEGORY_OPTIONS
          },
          {
            type: "string",
            name: "tags",
            label: "Tags",
            list: true
          },
          {
            type: "image",
            name: "logoUrl",
            label: "Logo/Icon"
          },
          {
            type: "string",
            name: "websiteUrl",
            label: "Official Website"
          },
          {
            type: "string",
            name: "repoUrl",
            label: "GitHub Repository"
          },
          {
            type: "string",
            name: "docsUrl",
            label: "Documentation URL"
          },
          {
            type: "string",
            name: "pricing",
            label: "Pricing Model",
            options: ["Free", "Freemium", "Paid", "Open Source"]
          },
          {
            type: "number",
            name: "stars",
            label: "GitHub Stars"
          },
          {
            type: "string",
            name: "license",
            label: "License",
            options: ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "Proprietary", "Other"]
          },
          {
            type: "boolean",
            name: "featured",
            label: "Featured"
          },
          {
            type: "datetime",
            name: "date",
            label: "Date Added",
            required: true
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true
          }
        ]
      },
      {
        name: "request",
        label: "Tutorial Requests",
        path: "content/requests",
        format: "json",
        fields: [
          {
            type: "string",
            name: "topic",
            label: "Topic",
            required: true,
            isTitle: true
          },
          {
            type: "string",
            name: "category",
            label: "Category",
            required: true
          },
          {
            type: "string",
            name: "description",
            label: "Description",
            required: true,
            ui: { component: "textarea" }
          },
          {
            type: "string",
            name: "email",
            label: "Email"
          },
          {
            type: "string",
            name: "status",
            label: "Status",
            options: ["pending", "approved", "completed"]
          },
          {
            type: "datetime",
            name: "submittedAt",
            label: "Submitted At"
          }
        ]
      }
    ]
  }
});
export {
  config_default as default
};
