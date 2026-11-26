import { Spinner } from "@components/spinner"

// Under ~300ms nothing shows (the spinner fades in after --delay-spinner), so quick
// navigations never flash a loader. Routes with a known shape ship their own skeleton.
export default function Loading() {
  return (
    <div className="grid flex-1 place-content-center">
      <Spinner delayed label="Loading" className="size-6" />
    </div>
  )
}
