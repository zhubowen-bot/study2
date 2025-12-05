import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { userId, title, duration } = await request.json()

    if (!userId || !title || !duration) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const task = await db.studyTask.create({
      data: {
        userId,
        title,
        duration: parseInt(duration)
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('创建任务失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}