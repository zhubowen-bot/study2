'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Trophy, Wallet, User, CheckCircle2, Circle, ArrowUp, Wifi, WifiOff } from 'lucide-react'

interface StudyTask {
  id: string
  title: string
  duration: number
  isCompleted: boolean
  completedAt?: string
}

interface StudyUser {
  id: string
  name: string
  level: number
  money: number
  tasks: StudyTask[]
}

const WEALTH_LEVELS = [
  { min: 0, max: 999, title: '一无所有的人', emoji: '😢', color: 'text-gray-500', bg: 'bg-gray-50' },
  { min: 1000, max: 9999, title: '拮据的人', emoji: '😰', color: 'text-orange-500', bg: 'bg-orange-50' },
  { min: 10000, max: 99999, title: '勉强糊口的人', emoji: '😟', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { min: 100000, max: 999999, title: '小康生活的人', emoji: '😊', color: 'text-green-500', bg: 'bg-green-50' },
  { min: 1000000, max: 9999999, title: '可以买大房子的人', emoji: '😎', color: 'text-blue-500', bg: 'bg-blue-50' },
  { min: 10000000, max: 99999999, title: '中产阶级', emoji: '🤵', color: 'text-purple-500', bg: 'bg-purple-50' },
  { min: 100000000, max: 999999999, title: '富裕阶层', emoji: '🏆', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { min: 1000000000, max: 9999999999, title: '百万富翁', emoji: '💰', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  { min: 10000000000, max: Infinity, title: '财富自由的人', emoji: '👑', color: 'text-red-600', bg: 'bg-red-50' }
]

export default function Home() {
  const [currentUser, setCurrentUser] = useState<'A' | 'B'>('A')
  const [userData, setUserData] = useState<Record<'A' | 'B', StudyUser | null>>({ A: null, B: null })
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDuration, setNewTaskDuration] = useState('')
  const [pinIncomplete, setPinIncomplete] = useState(true)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // 获取财富阶层
  const getWealthLevel = (money: number) => {
    return WEALTH_LEVELS.find(level => money >= level.min && money <= level.max) || WEALTH_LEVELS[0]
  }

  // 计算升级奖励
  const calculateLevelReward = (fromLevel: number, toLevel: number) => {
    let totalReward = 0
    for (let level = fromLevel; level < toLevel; level++) {
      totalReward += level * 10 // 1->2:10元, 2->3:20元, 3->4:30元...
    }
    return totalReward
  }

  // 初始化WebSocket连接
  useEffect(() => {
    const newSocket = io('/?XTransformPort=3003')
    
    newSocket.on('connect', () => {
      console.log('WebSocket连接成功')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('WebSocket连接断开')
      setIsConnected(false)
    })

    // 监听任务更新
    newSocket.on('task-update', (taskData) => {
      console.log('收到任务更新:', taskData)
      fetchUserData(currentUser)
    })

    // 监听用户数据更新
    newSocket.on('user-update', (userData) => {
      console.log('收到用户数据更新:', userData)
      setUserData(prev => ({ ...prev, [currentUser]: userData }))
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // 当切换用户时，加入对应的房间
  useEffect(() => {
    if (socket && currentUser) {
      socket.emit('join-user', currentUser)
    }
  }, [socket, currentUser])

  // 获取用户数据
  const fetchUserData = async (user: 'A' | 'B') => {
    try {
      const response = await fetch(`/api/user/${user}`)
      if (response.ok) {
        const data = await response.json()
        setUserData(prev => ({ ...prev, [user]: data }))
      }
    } catch (error) {
      console.error('获取用户数据失败:', error)
    }
  }

  // 添加任务
  const addTask = async () => {
    if (!newTaskTitle.trim() || !newTaskDuration) return

    try {
      const response = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData[currentUser]?.id,
          title: newTaskTitle,
          duration: parseInt(newTaskDuration)
        })
      })

      if (response.ok) {
        setNewTaskTitle('')
        setNewTaskDuration('')
        fetchUserData(currentUser)
        
        // 通知其他客户端任务已更新
        if (socket) {
          socket.emit('task-updated', {
            userLetter: currentUser,
            taskData: { action: 'add', title: newTaskTitle }
          })
        }
      }
    } catch (error) {
      console.error('添加任务失败:', error)
    }
  }

  // 完成任务
  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/task/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      })

      if (response.ok) {
        const result = await response.json()
        fetchUserData(currentUser)
        
        // 通知其他客户端任务已完成
        if (socket) {
          socket.emit('task-updated', {
            userLetter: currentUser,
            taskData: { action: 'complete', taskId, reward: result.reward }
          })
          
          socket.emit('user-updated', {
            userLetter: currentUser,
            userData: {
              level: result.newLevel,
              money: result.reward
            }
          })
        }
      }
    } catch (error) {
      console.error('完成任务失败:', error)
    }
  }

  // 排序任务
  const getSortedTasks = (tasks: StudyTask[]) => {
    if (!pinIncomplete) return tasks
    return [...tasks].sort((a, b) => {
      if (a.isCompleted === b.isCompleted) return 0
      return a.isCompleted ? 1 : -1
    })
  }

  useEffect(() => {
    fetchUserData('A')
    fetchUserData('B')
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchUserData(currentUser)
    }
  }, [currentUser])

  const user = userData[currentUser]
  const wealthLevel = user ? getWealthLevel(user.money) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-4xl font-bold text-gray-800">学习激励平台</h1>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? '已连接' : '离线'}
              </span>
            </div>
          </div>
          <p className="text-gray-600">完成任务，升级赚钱，成为学习达人！</p>
        </div>

        {/* 用户切换 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              当前用户：用户{currentUser}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={currentUser === 'A' ? 'default' : 'outline'}
                onClick={() => setCurrentUser('A')}
                className="flex-1"
              >
                用户A
              </Button>
              <Button
                variant={currentUser === 'B' ? 'default' : 'outline'}
                onClick={() => setCurrentUser('B')}
                className="flex-1"
              >
                用户B
              </Button>
            </div>
          </CardContent>
        </Card>

        {user && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* 等级信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  等级信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-6xl font-bold text-yellow-500 mb-2">Lv.{user.level}</div>
                  <div className="text-sm text-gray-600">
                    下次升级奖励：{user.level * 10}元
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 小金库 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-500" />
                  小金库
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-500 mb-2">
                    ¥{(user.money / 100).toFixed(2)}
                  </div>
                  {wealthLevel && (
                    <div className={`${wealthLevel.bg} rounded-lg p-3 border`}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">{wealthLevel.emoji}</span>
                        <Badge className={`${wealthLevel.color} bg-transparent border-current`}>
                          {wealthLevel.title}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ¥{(wealthLevel.min / 100).toFixed(2)} - ¥{wealthLevel.max === Infinity ? '∞' : (wealthLevel.max / 100).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 任务管理 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>学习任务</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="pin-incomplete">置顶未完成</Label>
                <Switch
                  id="pin-incomplete"
                  checked={pinIncomplete}
                  onCheckedChange={setPinIncomplete}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 添加任务 */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="任务名称"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="时长(分钟)"
                type="number"
                value={newTaskDuration}
                onChange={(e) => setNewTaskDuration(e.target.value)}
                className="w-24"
              />
              <Button onClick={addTask}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* 任务列表 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {user && getSortedTasks(user.tasks).map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    task.isCompleted ? 'bg-gray-50 opacity-60' : 'bg-white'
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => completeTask(task.id)}
                    disabled={task.isCompleted}
                    className="p-1"
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <div className={`font-medium ${task.isCompleted ? 'line-through' : ''}`}>
                      {task.title}
                    </div>
                    <div className="text-sm text-gray-500">{task.duration}分钟</div>
                  </div>
                  {task.isCompleted && (
                    <Badge variant="secondary" className="text-green-600">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      +{(task.level || 1) * 10}元
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}