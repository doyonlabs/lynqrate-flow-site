import { Card, CardContent } from "@/components/ui/card"

export default function FailPage() {
    return (
    <div className="max-w-md mx-auto py-20 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">❌ 인증 실패</h1>
        <Card>
            <CardContent className="p-6">
                <p className="text-red-500">
                    이용권을 확인할 수 없습니다.
                </p>
                <p className="text-sm text-gray-500">
                    입력하신 코드가 만료되었거나 존재하지 않을 수 있습니다.
                </p>
            </CardContent>
        </Card>
    </div>
  )
}