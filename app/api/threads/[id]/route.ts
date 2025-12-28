import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET a single thread with all messages
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const thread = await prisma.thread.findUnique({
            where: { id: params.id },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!thread) {
            return NextResponse.json(
                { error: "Thread not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(thread);
    } catch (error) {
        console.error("Failed to fetch thread:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread" },
            { status: 500 }
        );
    }
}

// DELETE a thread (cascades to messages)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.thread.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete thread:", error);
        return NextResponse.json(
            { error: "Failed to delete thread" },
            { status: 500 }
        );
    }
}

// PATCH update thread title
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { title } = await request.json();

        const thread = await prisma.thread.update({
            where: { id: params.id },
            data: { title },
        });

        return NextResponse.json(thread);
    } catch (error) {
        console.error("Failed to update thread:", error);
        return NextResponse.json(
            { error: "Failed to update thread" },
            { status: 500 }
        );
    }
}
