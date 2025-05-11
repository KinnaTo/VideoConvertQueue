import { Card, CardBody, CardHeader } from "@heroui/react";

import DefaultLayout from "@/layouts/default";

export default function SettingsPage() {
  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">系统设置</h1>
        </div>

        <Card className="w-full">
          <CardHeader>
            <p className="text-lg font-bold">通用设置</p>
          </CardHeader>
          <CardBody>
            <p className="text-center p-8 text-default-500">
              设置页面开发中，请稍后查看...
            </p>
          </CardBody>
        </Card>
      </div>
    </DefaultLayout>
  );
}
