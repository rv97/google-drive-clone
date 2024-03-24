import { ConvexError, v } from 'convex/values';
import { MutationCtx, QueryCtx, mutation, query } from './_generated/server';
import { getUser } from './users';

const hasAccessToOrg = async (ctx: QueryCtx | MutationCtx, tokenIdentifier: string, orgId: string) => {
    const user = await getUser(ctx, tokenIdentifier);
    return user.orgIds.includes(orgId) || user.tokenIdentifier.includes(orgId);
}

export const createFile = mutation({
    args: {
        name: v.string(),
        orgId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError('Not authenticated');
        }
        const hasAccess = await hasAccessToOrg(ctx, identity.tokenIdentifier, args.orgId);
        if (!hasAccess) {
            throw new ConvexError('Not authorized');
        }
        await ctx.db.insert('files', {
            name: args.name,
            orgId: args.orgId,
        });
    }
})

export const getFiles = query({
    args: {
        orgId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {            
            return [];
        }

        const hasAccess = await hasAccessToOrg(ctx, identity.tokenIdentifier, args.orgId);
        if (!hasAccess) {
            return [];
        }
        return await ctx.db.query('files').withIndex("by_orgId", q => q.eq('orgId', args.orgId)).collect();
    }
})