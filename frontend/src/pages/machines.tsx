import { Card, CardBody, CardHeader } from "@heroui/react";

import DefaultLayout from "@/layouts/default";

export default function MachinesPage() {
  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">机器管理</h1>
        </div>

        <Card className="w-full">
          <CardHeader>
            <p className="text-lg font-bold">所有机器</p>
          </CardHeader>
          <CardBody>
            <p className="text-center p-8 text-default-500">
              机器详情页面开发中，请稍后查看...
            </p>
          </CardBody>
        </Card>
      </div>
    </DefaultLayout>
  );
}
