import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Progress,
} from "@heroui/react";

import DefaultLayout from "@/layouts/default";
import apiService from "@/services/api";
import authService from "@/services/auth";
import AuthModal from "@/components/auth-modal";
import { Machine, Task, TaskStats, TaskStatus } from "@/types/api";

// 刷新间隔（毫秒）
const REFRESH_INTERVAL = 5000;

export default function IndexPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats>({
    WAITING: 0,
    DOWNLOADING: 0,
    CONVERTING: 0,
    UPLOADING: 0,
    FINISHED: 0,
    FAILED: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      // 检查是否已认证，如果没有则显示认证模态框
      if (!authService.isAuthenticated()) {
        setIsAuthModalOpen(true);
        return;
      }

      setError(null);
      const data = await apiService.getDashboardData();

      setMachines(data.machines);
      setTasks(data.tasks);
      setTaskStats(data.taskStats);
      setLastUpdated(new Date().toLocaleTimeString());
      
      // 重置重试计数
      if (retryCount > 0) {
        setRetryCount(0);
      }
    } catch (err) {
      console.error("获取数据失败:", err);
      
      // 检查是否是认证错误
      if (err instanceof Error && err.message === "AUTH_ERROR") {
        setIsAuthModalOpen(true);
        return;
      }
      
      setError(`获取数据失败，请检查网络连接或API服务是否正常。重试次数: ${retryCount + 1}`);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 首次加载数据
    fetchData();
    
    // 设置定时器，每5秒更新一次数据
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    
    // 组件卸载时清除定时器
    return () => clearInterval(interval);
  }, []);

  // 当出现错误时，尝试自动重连
  useEffect(() => {
    if (error && retryCount > 0) {
      const retryTimeout = setTimeout(() => {
        console.log(`尝试第${retryCount}次重新连接...`);
        fetchData();
      }, Math.min(retryCount * 2000, 10000)); // 指数退避，最长10秒
      
      return () => clearTimeout(retryTimeout);
    }
  }, [error, retryCount]);

  // 认证成功后的处理
  const handleAuthSuccess = () => {
    setLoading(true);
    fetchData();
  };

  const getStatusChip = (status: TaskStatus) => {
    const statusMap: Record<
      TaskStatus,
      {
        color: "success" | "warning" | "danger" | "primary" | "secondary";
        text: string;
      }
    > = {
      WAITING: { color: "secondary", text: "等待中" },
      DOWNLOADING: { color: "primary", text: "下载中" },
      CONVERTING: { color: "warning", text: "转换中" },
      UPLOADING: { color: "primary", text: "上传中" },
      FINISHED: { color: "success", text: "已完成" },
      FAILED: { color: "danger", text: "失败" },
    };

    return (
      <Chip color={statusMap[status].color} variant="flat">
        {statusMap[status].text}
      </Chip>
    );
  };

  // 计算任务进度
  const calculateTaskProgress = (task: Task): number => {
    switch (task.status) {
      case "DOWNLOADING":
        return task.downloadInfo?.progress || 0;
      case "CONVERTING":
        return task.convertInfo?.progress || 0;
      case "UPLOADING":
        return task.uploadInfo?.progress || 0;
      case "FINISHED":
        return 100;
      case "FAILED":
        return 0;
      default:
        return 0;
    }
  };

  // 机器列表渲染
  const renderMachineRows = () => {
    if (machines.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="text-center p-4">没有找到机器</div>
          </TableCell>
        </TableRow>
      );
    }

    return machines.map((machine) => (
      <TableRow key={machine.id}>
        <TableCell>{machine.name}</TableCell>
        <TableCell>{machine.ip}</TableCell>
        <TableCell>
          <Chip color={machine.isOnline ? "success" : "danger"} variant="flat">
            {machine.isOnline ? "在线" : "离线"}
          </Chip>
        </TableCell>
        <TableCell>{machine.encoder || "未知"}</TableCell>
        <TableCell>
          {machine.successCount || 0} / {machine.failedCount || 0}
        </TableCell>
        <TableCell>
          {machine.heartbeat
            ? new Date(machine.heartbeat).toLocaleTimeString()
            : "无"}
        </TableCell>
      </TableRow>
    ));
  };

  // 活跃任务列表渲染
  const renderActiveTaskRows = () => {
    const activeTasks = tasks.filter((task) =>
      ["DOWNLOADING", "CONVERTING", "UPLOADING"].includes(task.status),
    );

    if (activeTasks.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="text-center p-4">没有正在执行的任务</div>
          </TableCell>
        </TableRow>
      );
    }

    return activeTasks.map((task) => {
      const machine = machines.find((m) => m.id === task.machineId);
      const progress = calculateTaskProgress(task);

      return (
        <TableRow key={task.id}>
          <TableCell>{task.name}</TableCell>
          <TableCell>{getStatusChip(task.status)}</TableCell>
          <TableCell>{task.priority}</TableCell>
          <TableCell>{machine?.name || "未分配"}</TableCell>
          <TableCell>
            <Progress
              className="max-w-md"
              color={
                task.status === "DOWNLOADING"
                  ? "primary"
                  : task.status === "CONVERTING"
                    ? "warning"
                    : task.status === "UPLOADING"
                      ? "secondary"
                      : "default"
              }
              label={`${Math.round(progress)}%`}
              value={progress}
            />
          </TableCell>
          <TableCell>{new Date(task.createdAt).toLocaleString()}</TableCell>
        </TableRow>
      );
    });
  };

  // 等待中任务列表渲染
  const renderWaitingTaskRows = () => {
    const waitingTasks = tasks
      .filter((task) => task.status === "WAITING")
      .sort((a, b) => b.priority - a.priority);

    if (waitingTasks.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4}>
            <div className="text-center p-4">没有等待中的任务</div>
          </TableCell>
        </TableRow>
      );
    }

    return waitingTasks.map((task) => (
      <TableRow key={task.id}>
        <TableCell>{task.name}</TableCell>
        <TableCell>{task.priority}</TableCell>
        <TableCell>{task.source || "未知"}</TableCell>
        <TableCell>{new Date(task.createdAt).toLocaleString()}</TableCell>
      </TableRow>
    ));
  };

  // 最近完成和失败的任务列表渲染
  const renderRecentTaskRows = () => {
    const recentTasks = tasks
      .filter((task) => ["FINISHED", "FAILED"].includes(task.status))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 10);

    if (recentTasks.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4}>
            <div className="text-center p-4">没有最近完成或失败的任务</div>
          </TableCell>
        </TableRow>
      );
    }

    return recentTasks.map((task) => {
      const machine = machines.find((m) => m.id === task.machineId);

      return (
        <TableRow key={task.id}>
          <TableCell>{task.name}</TableCell>
          <TableCell>{getStatusChip(task.status)}</TableCell>
          <TableCell>{machine?.name || "未分配"}</TableCell>
          <TableCell>{new Date(task.updatedAt).toLocaleString()}</TableCell>
        </TableRow>
      );
    });
  };

  return (
    <DefaultLayout>
      {/* 认证模态框 */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">视频转换队列监控</h1>
          <div className="text-sm">
            最后更新: {lastUpdated || "未更新"}{" "}
            {loading && <Spinner size="sm" />}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <Card className="w-full bg-danger-50">
            <CardBody>
              <p className="text-danger">{error}</p>
            </CardBody>
          </Card>
        )}

        {/* 任务状态统计 */}
        <Card className="w-full">
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-lg font-bold">任务状态统计</p>
              <p className="text-small text-default-500">
                当前系统中任务的状态分布
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex flex-col items-center p-3 border rounded-md">
                <span className="text-2xl font-bold">{taskStats.WAITING}</span>
                <span className="text-small text-default-500">等待中</span>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md">
                <span className="text-2xl font-bold">
                  {taskStats.DOWNLOADING}
                </span>
                <span className="text-small text-default-500">下载中</span>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md">
                <span className="text-2xl font-bold">
                  {taskStats.CONVERTING}
                </span>
                <span className="text-small text-default-500">转换中</span>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md">
                <span className="text-2xl font-bold">
                  {taskStats.UPLOADING}
                </span>
                <span className="text-small text-default-500">上传中</span>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md">
                <span className="text-2xl font-bold text-success">
                  {taskStats.FINISHED}
                </span>
                <span className="text-small text-default-500">已完成</span>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md">
                <span className="text-2xl font-bold text-danger">
                  {taskStats.FAILED}
                </span>
                <span className="text-small text-default-500">失败</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 机器状态 */}
        <Card className="w-full">
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-lg font-bold">机器状态</p>
              <p className="text-small text-default-500">
                活跃机器状态和运行情况
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center">
                <Spinner label="加载中..." />
              </div>
            ) : (
              <Table aria-label="机器列表">
                <TableHeader>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>IP地址</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>编码器</TableColumn>
                  <TableColumn>成功/失败</TableColumn>
                  <TableColumn>最后心跳</TableColumn>
                </TableHeader>
                <TableBody>{renderMachineRows()}</TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* 活跃任务 */}
        <Card className="w-full">
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-lg font-bold">活跃任务</p>
              <p className="text-small text-default-500">当前正在执行的任务</p>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center">
                <Spinner label="加载中..." />
              </div>
            ) : (
              <Table aria-label="活跃任务列表">
                <TableHeader>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>优先级</TableColumn>
                  <TableColumn>机器</TableColumn>
                  <TableColumn>进度</TableColumn>
                  <TableColumn>创建时间</TableColumn>
                </TableHeader>
                <TableBody>{renderActiveTaskRows()}</TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* 等待中任务 */}
        <Card className="w-full">
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-lg font-bold">等待中任务</p>
              <p className="text-small text-default-500">排队等待处理的任务</p>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center">
                <Spinner label="加载中..." />
              </div>
            ) : (
              <Table aria-label="等待中任务列表">
                <TableHeader>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>优先级</TableColumn>
                  <TableColumn>源</TableColumn>
                  <TableColumn>创建时间</TableColumn>
                </TableHeader>
                <TableBody>{renderWaitingTaskRows()}</TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* 最近完成和失败的任务 */}
        <Card className="w-full">
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-lg font-bold">最近完成和失败任务</p>
              <p className="text-small text-default-500">最近处理完成的任务</p>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center">
                <Spinner label="加载中..." />
              </div>
            ) : (
              <Table aria-label="最近完成和失败任务列表">
                <TableHeader>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>机器</TableColumn>
                  <TableColumn>完成时间</TableColumn>
                </TableHeader>
                <TableBody>{renderRecentTaskRows()}</TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </DefaultLayout>
  );
}
