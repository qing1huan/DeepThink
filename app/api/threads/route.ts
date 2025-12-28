import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET all threads (ordered by most recent)
export async function GET() {
    try {
        const threads = await prisma.thread.findMany({
            orderBy: { updatedAt: "desc" },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        return NextResponse.json(threads);
    } catch (error) {
        console.error("Failed to fetch threads:", error);
        return NextResponse.json(
            { error: "Failed to fetch threads" },
            { status: 500 }
        );
    }
}

// POST create a new thread
export async function POST(request: NextRequest) {
    try {
        const { title } = await request.json();

        const thread = await prisma.thread.create({
            data: {
                title: title || "New Conversation",
            },
        });

        return NextResponse.json(thread);
    } catch (error) {
        console.error("Failed to create thread:", error);
        return NextResponse.json(
            { error: "Failed to create thread" },
            { status: 500 }
        );
    }
}
