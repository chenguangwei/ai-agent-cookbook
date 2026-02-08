import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, category, description, email } = body;

    // Validate required fields
    if (!topic || !category || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const requestId = generateId();
    const submittedAt = new Date().toISOString();

    const requestData = {
      topic,
      category,
      description,
      email: email || '',
      status: 'pending',
      submittedAt,
    };

    // Write JSON file to content/requests/
    const requestsDir = path.join(process.cwd(), 'content', 'requests');
    await fs.mkdir(requestsDir, { recursive: true });

    const filePath = path.join(requestsDir, `${requestId}.json`);
    await fs.writeFile(filePath, JSON.stringify(requestData, null, 2), 'utf-8');

    return NextResponse.json(
      { message: 'Request submitted successfully', id: requestId },
      { status: 200 }
    );
  } catch (err) {
    console.error('Failed to process request:', err);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
