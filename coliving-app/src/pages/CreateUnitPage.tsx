import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { CreateUnitForm } from '../features/units/CreateUnitForm'

export function CreateUnitPage() {
  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <Link to="/home">
        <Button variant="ghost" className="mb-4 w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Create a new unit</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add your coliving space to start tracking expenses and splitting costs.
            </p>
          </CardHeader>
          <CardContent>
            <CreateUnitForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
