import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Article ID is required' },
                { status: 400 }
            );
        }

        const { data: article, error } = await supabase
            .from('news_items')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !article) {
            return NextResponse.json(
                { error: 'Article not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ article });
    } catch (error) {
        console.error('Error fetching article:', error);
        return NextResponse.json(
            { error: 'Failed to fetch article' },
            { status: 500 }
        );
    }
}
