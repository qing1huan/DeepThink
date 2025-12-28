import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST save a message to a thread
export async function POST(request: NextRequest) {
    try {
        const { threadId, role, content, thoughts } = await request.json();

        if (!threadId || !role || !content) {
            return NextResponse.json(
                { error: "threadId, role, and content are required" },
                { status: 400 }
            );
        }

        // Create the message
        const message = await prisma.message.create({
            data: {
                role,
                content,
                thoughts: thoughts || null,
                threadId,
            },
        });

        // Update thread's updatedAt timestamp
        await prisma.thread.update({
            where: { id: threadId },
            data: { updatedAt: new Date() },
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error("Failed to save message:", error);
        return NextResponse.json(
            { error: "Failed to save message" },
            { status: 500 }
        );
    }
}
