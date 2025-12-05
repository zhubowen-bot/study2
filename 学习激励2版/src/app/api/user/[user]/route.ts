import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user: string }> }
) {
  try {
    const { user: userParam } = await params
    const userLetter = userParam.toUpperCase()
    
    if (userLetter !== 'A' && userLetter !== 'B') {
      return NextResponse.json({ error: '无效的用户' }, { status: 400 })
    }

    // 获取或创建用户
    let user = await db.studyUser.findUnique({
      where: { name: userLetter },
      include: { tasks: true }
    })

    if (!user) {
      user = await db.studyUser.create({
        data: {
          name: userLetter,
          level: 1,
          money: 0
        },
        include: { tasks: true }
      })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('获取用户数据失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}