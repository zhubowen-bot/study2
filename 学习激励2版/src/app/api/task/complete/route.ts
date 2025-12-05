import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: '缺少任务ID' }, { status: 400 })
    }

    // 获取任务和用户信息
    const task = await db.studyTask.findUnique({
      where: { id: taskId },
      include: { user: true }
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    if (task.isCompleted) {
      return NextResponse.json({ error: '任务已完成' }, { status: 400 })
    }

    // 计算奖励（当前等级 * 10元，转换为分）
    const reward = task.user.level * 10 * 100

    // 更新任务状态和用户等级、财富
    const [updatedTask] = await db.$transaction([
      db.studyTask.update({
        where: { id: taskId },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      }),
      db.studyUser.update({
        where: { id: task.userId },
        data: {
          level: task.user.level + 1,
          money: task.user.money + reward
        }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      reward: reward / 100,
      newLevel: task.user.level + 1
    })
  } catch (error) {
    console.error('完成任务失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}