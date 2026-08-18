import { defineArrayMember, defineField, defineType } from "sanity";

export const homePageType = defineType({
  name: "homePage",
  title: "Home Page",
  type: "document",
  fields: [
    defineField({
      name: "language",
      type: "string",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "pageTitle",
      title: "Page Title",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "pageSubtitle",
      title: "Page Subtitle",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "latestIssue",
      title: "Latest Newspaper Issue",
      type: "object",
      fields: [
        defineField({
          name: "date",
          title: "Date",
          type: "string",
          description: 'Display string, e.g. "March 2026"',
          validation: (r) => r.required(),
        }),
        defineField({
          name: "number",
          title: "Issue Number",
          type: "string",
          description: 'Display string, e.g. "#764"',
          validation: (r) => r.required(),
        }),
      ],
    }),

    defineField({
      name: "chapters",
      title: "Chapters",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "name",
              title: "Name",
              type: "string",
              validation: (r) => r.required(),
            }),
            defineField({
              name: "websiteUrl",
              title: "Website URL",
              description: "Leave blank if the chapter has no website",
              type: "url",
            }),
          ],
          preview: {
            select: { title: "name", subtitle: "websiteUrl" },
          },
        }),
      ],
    }),
  ],
});
