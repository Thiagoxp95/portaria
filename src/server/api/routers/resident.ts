import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { residents } from "~/server/db/schema";

export const residentRouter = createTRPCRouter({
  /**
   * Get phone number by apartment number
   * Public endpoint for MCP access
   */
  getPhoneByApartment: publicProcedure
    .input(
      z.object({
        apartmentNumber: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const resident = await ctx.db.query.residents.findFirst({
        where: eq(residents.apartmentNumber, input.apartmentNumber),
      });

      if (!resident) {
        throw new Error(
          `No resident found for apartment ${input.apartmentNumber}`,
        );
      }

      if (!resident.isActive) {
        throw new Error(
          `Resident for apartment ${input.apartmentNumber} is inactive`,
        );
      }

      return {
        apartmentNumber: resident.apartmentNumber,
        phoneNumber: resident.phoneNumber,
        residentName: resident.residentName,
      };
    }),

  /**
   * Get all residents
   * Protected endpoint for admin use
   */
  getAllResidents: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const allResidents = await ctx.db.query.residents.findMany({
        orderBy: (residents, { asc }) => [asc(residents.apartmentNumber)],
      });

      return input.includeInactive
        ? allResidents
        : allResidents.filter((r) => r.isActive);
    }),

  /**
   * Add a new resident
   */
  addResident: publicProcedure
    .input(
      z.object({
        apartmentNumber: z.string().min(1),
        phoneNumber: z.string().min(1),
        residentName: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if apartment already exists
      const existing = await ctx.db.query.residents.findFirst({
        where: eq(residents.apartmentNumber, input.apartmentNumber),
      });

      if (existing) {
        throw new Error(
          `Apartment ${input.apartmentNumber} already has a registered resident`,
        );
      }

      await ctx.db.insert(residents).values({
        apartmentNumber: input.apartmentNumber,
        phoneNumber: input.phoneNumber,
        residentName: input.residentName,
        notes: input.notes,
        isActive: true,
      });

      return {
        success: true,
        apartmentNumber: input.apartmentNumber,
      };
    }),

  /**
   * Update resident information
   */
  updateResident: publicProcedure
    .input(
      z.object({
        apartmentNumber: z.string().min(1),
        phoneNumber: z.string().min(1).optional(),
        residentName: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { apartmentNumber, ...updateData } = input;

      await ctx.db
        .update(residents)
        .set(updateData)
        .where(eq(residents.apartmentNumber, apartmentNumber));

      return {
        success: true,
        apartmentNumber,
      };
    }),

  /**
   * Delete a resident
   */
  deleteResident: publicProcedure
    .input(
      z.object({
        apartmentNumber: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(residents)
        .where(eq(residents.apartmentNumber, input.apartmentNumber));

      return {
        success: true,
        apartmentNumber: input.apartmentNumber,
      };
    }),
});
