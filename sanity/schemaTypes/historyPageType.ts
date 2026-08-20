import { defineArrayMember, defineField, defineType } from "sanity";
import { slugIsUniquePerLanguage } from "../lib/slugIsUniquePerLanguage";

export const historyPageType = defineType({
  name: "historyPage",
  title: "History Page",
  type: "document",
  fields: [
    defineField({
      name: "language",
      type: "string",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", isUnique: slugIsUniquePerLanguage },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
    }),
    defineField({
      name: "picture",
      title: "Picture",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "added_at",
      title: "Added At",
      type: "datetime",
      description:
        "Controls display order — the 5 most recent pages (by this date) show on the home page, and it also orders the /history catalog. Pages without a date set here won't appear in either listing.",
      validation: (r) => r.required(),
    }),

    defineField({
      name: "content",
      title: "Content",
      type: "array",
      of: [
        // 1. Section title
        defineArrayMember({
          name: "sectionTitle",
          title: "Section Title",
          type: "object",
          fields: [
            defineField({
              name: "text",
              type: "string",
              validation: (r) => r.required(),
            }),
          ],
          preview: { select: { title: "text" }, prepare: ({ title }) => ({ title, subtitle: "Section Title" }) },
        }),

        // 2. Paragraph
        defineArrayMember({
          name: "paragraph",
          title: "Paragraph",
          type: "object",
          fields: [
            defineField({
              name: "text",
              type: "text",
              validation: (r) => r.required(),
            }),
          ],
          preview: { select: { title: "text" }, prepare: ({ title }) => ({ title, subtitle: "Paragraph" }) },
        }),

        // 3. Quote
        defineArrayMember({
          name: "quote",
          title: "Quote",
          type: "object",
          fields: [
            defineField({
              name: "text",
              type: "string",
              validation: (r) => r.required(),
            }),
            defineField({
              name: "subtext",
              type: "string",
            }),
          ],
          preview: { select: { title: "text" }, prepare: ({ title }) => ({ title, subtitle: "Quote" }) },
        }),

        // 4. Picture (big)
        defineArrayMember({
          name: "pictureBig",
          title: "Picture (Big)",
          type: "object",
          fields: [
            defineField({
              name: "picture",
              title: "Picture",
              type: "image",
              options: { hotspot: true },
              validation: (r) => r.required(),
            }),
            defineField({
              name: "subtext",
              type: "string",
            }),
          ],
          preview: { select: { media: "picture" }, prepare: ({ media }) => ({ media, subtitle: "Picture (Big)" }) },
        }),

        // 5. Two pictures side-by-side
        defineArrayMember({
          name: "pictureTwoPictures",
          title: "Two Pictures",
          type: "object",
          fields: [
            defineField({
              name: "pictures",
              title: "Pictures",
              type: "array",
              of: [
                defineArrayMember({
                  type: "object",
                  fields: [
                    defineField({
                      name: "picture",
                      title: "Picture",
                      type: "image",
                      options: { hotspot: true },
                      validation: (r) => r.required(),
                    }),
                    defineField({
                      name: "subtext",
                      type: "string",
                    }),
                  ],
                }),
              ],
              validation: (r) => r.required().min(2).max(2),
            }),
          ],
          preview: { prepare: () => ({ title: "Two Pictures" }) },
        }),
      ],
    }),
  ],
});
