import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { AddExpenseForm } from '../features/expenses/AddExpenseForm'

export function AddExpensePage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <Link to={`/units/${id}`}>
        <Button variant="ghost" className="mb-4 w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold leading-tight sm:text-3xl">
              Add expense
            </CardTitle>
            <p className="mt-2 text-base text-muted-foreground">
              Log a shared expense for your unit.
            </p>
          </CardHeader>
          <CardContent>
            {id && <AddExpenseForm unitId={id} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
