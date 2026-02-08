// tina/config.ts
import { defineConfig } from "tinacms";
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
            options: [
              "Frameworks",
              "LLM Models",
              "Agentic Workflows",
              "Real-world Cases",
              "RAG",
              "Prompting"
            ]
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
          }
        ]
      },
      {
        name: "showcase",
        label: "Showcase Projects",
        path: "content/showcase",
        format: "json",
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
            name: "repoUrl",
            label: "Repo URL"
          },
          {
            type: "image",
            name: "thumbnail",
            label: "Thumbnail"
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
