import { z } from "zod";

// TODO: createa script to generate this file based on cli for m365 docs

export const ListAddSchema = z.object({
    title: z.string().describe("Title of the list to add."),
    webUrl: z.string().describe("URL of the site where the list should be added.")
});

export const ListGetSchema = z.object({
    title: z.string().describe("Title of the list."),
    webUrl: z.string().describe("URL of the site where the list is located."),
    withPermissions: z.boolean().optional().default(false).describe("Set if you want to return associated roles and permissions of the list.")
});

export const ListListSchema = z.object({
    webUrl: z.string().describe("URL of the site where the lists to retrieve are located.")
});

export const ListRemoveSchema = z.object({
    title: z.string().describe("Title of the list to remove."),
    webUrl: z.string().describe("URL of the site where the list to remove is located.")
});