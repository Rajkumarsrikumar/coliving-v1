import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { AddContributionForm } from '../features/contributions/AddContributionForm'

export function AddContributionPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <Link to={`/units/${id}/contributions`}>
        <Button variant="ghost" className="mb-4 w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Request contribution</CardTitle>
            <p className="text-sm text-muted-foreground">
              Request a one-time contribution from housemates for repairs, extra cleaning, or other shared costs.
            </p>
          </CardHeader>
          <CardContent>
            {id && <AddContributionForm unitId={id} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
