import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMaterials } from '@/hooks/useMaterials'
import { useCreateDesign } from '@/hooks/useCreateDesign'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectItem } from '@/components/ui/select'
import { NumberField } from '@/components/ui/number-field'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { InfoTip } from '@/components/ui/info-tip'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { ErrorState } from '@/components/feedback/ErrorState'
import { AxisFields } from '@/features/design-form/AxisFields'
import { ModeSelector } from '@/features/design-form/ModeSelector'
import { SummaryPanel } from '@/features/design-form/SummaryPanel'
import { formSchema } from '@/features/design-form/formSchema'
import { buildRequest } from '@/features/design-form/buildRequest'
import { DEFAULT_VALUES, EXAMPLE_VALUES } from '@/features/design-form/defaults'
import type { DesignFormValues } from '@/features/design-form/defaults'
import type { TargetMode } from '@/api/types'
import type { ApiError } from '@/api/client'
import { tilesPerAxis, isIntegerMultiple } from '@/lib/units'
import { FORM_BOUNDS } from '@/config/limits'
import { Beaker, ChevronDown, RotateCcw, Settings } from 'lucide-react'

export function DesignForm() {
  const {
    data: materials,
    isLoading: materialsLoading,
    error: materialsError,
    refetch: refetchMaterials,
  } = useMaterials()
  const createDesign = useCreateDesign()
  const [showSearch, setShowSearch] = useState(false)
  const [showAdvStrength, setShowAdvStrength] = useState(false)
  const [showAdvWeight, setShowAdvWeight] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DesignFormValues>({
    defaultValues: DEFAULT_VALUES,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  const formValues = watch()

  const onSubmit = handleSubmit((data: DesignFormValues) => {
    setSubmitError(null)
    const request = buildRequest(data)
    createDesign.mutate(request, {
      onError: (err: Error) => {
        const apiErr = err as ApiError
        const msg = apiErr.message ?? 'An error occurred'
        setSubmitError(msg)
        toast.error(msg)
      },
    })
  })

  const fillExample = () => {
    const matId = materials?.find((m) => m.id === 'ti64')?.id ?? materials?.[0]?.id ?? ''
    reset({ ...EXAMPLE_VALUES, material: matId })
  }

  // Computed hints
  const cellMm = parseFloat(formValues.cellMm) || 0
  const sizeX = parseFloat(formValues.partSizeX) || 0
  const sizeY = parseFloat(formValues.partSizeY) || 0
  const sizeZ = parseFloat(formValues.partSizeZ) || 0
  const cellWarning =
    cellMm > 0 &&
    sizeX > 0 &&
    (!isIntegerMultiple(sizeX, cellMm) ||
      !isIntegerMultiple(sizeY, cellMm) ||
      !isIntegerMultiple(sizeZ, cellMm))
      ? 'Part size is not an integer multiple of cell size'
      : undefined

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: form sections */}
        <div className="space-y-5">
          {submitError && <InlineAlert variant="error">{submitError}</InlineAlert>}

          {/* Material */}
          <Card>
            <CardHeader>
              <h2 className="text-text text-base font-semibold">Material</h2>
            </CardHeader>
            <CardContent>
              {materialsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : materialsError ? (
                <ErrorState
                  error={materialsError as Error}
                  onRetry={() => {
                    refetchMaterials()
                  }}
                  className="py-4"
                />
              ) : (
                <div className="space-y-3">
                  <Select
                    value={formValues.material}
                    onChange={(v) => setValue('material', v, { shouldValidate: true })}
                    placeholder="Choose a material"
                    error={errors.material?.message}
                  >
                    {materials?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-muted ml-2 text-xs">
                            E {m.E_gpa} GPa · σy {m.yield_mpa} MPa · {m.density_g_cm3} g/cm³
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                  {formValues.material && materials && (
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const m = materials.find((mat) => mat.id === formValues.material)
                        if (!m) return null
                        return (
                          <>
                            <Badge variant="neutral">E {m.E_gpa} GPa</Badge>
                            <Badge variant="neutral">σy {m.yield_mpa} MPa</Badge>
                            <Badge variant="neutral">{m.density_g_cm3} g/cm³</Badge>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stiffness */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-text text-base font-semibold">
                  Stiffness targets
                  <span className="text-muted ml-1.5 text-xs font-normal">(GPa)</span>
                </h2>
                <ModeSelector
                  value={formValues.stiffnessMode}
                  onChange={(v: TargetMode) => setValue('stiffnessMode', v)}
                  tolerancePct={formValues.tolerancePct}
                />
              </div>
            </CardHeader>
            <CardContent>
              <AxisFields
                prefix="stiffness"
                unit="GPa"
                register={register}
                errors={errors}
                watch={watch}
                setValue={setValue as (name: keyof DesignFormValues, value: unknown) => void}
              />
            </CardContent>
          </Card>

          {/* Strength */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-text text-base font-semibold">
                    Strength targets
                    <span className="text-muted ml-1.5 text-xs font-normal">(MPa)</span>
                  </h2>
                  <InfoTip content="Load the design takes before failing: the lower of yield and buckling." />
                </div>
                <ModeSelector
                  value={formValues.strengthMode}
                  onChange={(v: TargetMode) => setValue('strengthMode', v)}
                  tolerancePct={formValues.tolerancePct}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <AxisFields
                prefix="strength"
                unit="MPa"
                register={register}
                errors={errors}
                watch={watch}
                setValue={setValue as (name: keyof DesignFormValues, value: unknown) => void}
              />

              <button
                type="button"
                onClick={() => setShowAdvStrength(!showAdvStrength)}
                className="text-muted hover:text-text flex cursor-pointer items-center gap-1 text-xs"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showAdvStrength ? 'rotate-180' : ''}`}
                />
                Advanced
              </button>

              {showAdvStrength && (
                <div className="border-line animate-fade-in space-y-2 border-l-2 pl-3">
                  <p className="text-muted text-xs">Strength definition</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setValue('strengthType', 'effective')}
                      className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        formValues.strengthType === 'effective'
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line text-muted hover:text-text'
                      }`}
                    >
                      Effective (yield & buckling)
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('strengthType', 'yield_only')}
                      className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        formValues.strengthType === 'yield_only'
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line text-muted hover:text-text'
                      }`}
                    >
                      Yield only (tension)
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weight & Part */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-text text-base font-semibold">Weight & part</h2>
                <ModeSelector
                  value={formValues.weightMode}
                  onChange={(v: TargetMode) => setValue('weightMode', v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!formValues.useRelDensity ? (
                <NumberField
                  {...register('maxMassG')}
                  label="Max mass"
                  unit="g"
                  error={errors.maxMassG?.message}
                  placeholder="60"
                />
              ) : (
                <NumberField
                  {...register('relDensity')}
                  label="Relative density"
                  unit="—"
                  hint="0 < ρ < 1"
                  error={errors.relDensity?.message}
                  placeholder="0.12"
                />
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <NumberField
                  {...register('partSizeX')}
                  label="Size X"
                  unit="mm"
                  error={errors.partSizeX?.message}
                />
                <NumberField
                  {...register('partSizeY')}
                  label="Size Y"
                  unit="mm"
                  error={errors.partSizeY?.message}
                />
                <NumberField
                  {...register('partSizeZ')}
                  label="Size Z"
                  unit="mm"
                  error={errors.partSizeZ?.message}
                />
              </div>

              <div className="space-y-2">
                <NumberField
                  {...register('cellMm')}
                  label="Unit-cell size"
                  unit="mm"
                  error={errors.cellMm?.message}
                  warning={cellWarning}
                />
                {cellMm > 0 && sizeX > 0 && (
                  <p className="text-muted text-xs">
                    Tiles: {tilesPerAxis(sizeX, cellMm)} × {tilesPerAxis(sizeY, cellMm)} ×{' '}
                    {tilesPerAxis(sizeZ, cellMm)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAdvWeight(!showAdvWeight)}
                className="text-muted hover:text-text flex cursor-pointer items-center gap-1 text-xs"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showAdvWeight ? 'rotate-180' : ''}`}
                />
                Advanced
              </button>

              {showAdvWeight && (
                <div className="border-line animate-fade-in border-l-2 pl-3">
                  <Switch
                    checked={formValues.useRelDensity}
                    onChange={(v) => setValue('useRelDensity', v)}
                    label="Specify relative density instead of mass"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search settings (collapsed) */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="text-muted hover:text-text flex cursor-pointer items-center gap-2 text-sm"
          >
            <Settings className="h-4 w-4" />
            Search settings
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showSearch ? 'rotate-180' : ''}`}
            />
          </button>

          {showSearch && (
            <Card className="animate-fade-in">
              <CardContent className="space-y-4 pt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <NumberField
                    {...register('tolerancePct')}
                    label="Tolerance"
                    unit="%"
                    hint={`${FORM_BOUNDS.tolerance_pct.min}–${FORM_BOUNDS.tolerance_pct.max}%`}
                    error={errors.tolerancePct?.message}
                  />
                  <NumberField
                    {...register('nResults')}
                    label="Number of results"
                    unit="designs"
                    hint={`${FORM_BOUNDS.n_results.min}–${FORM_BOUNDS.n_results.max}`}
                    error={errors.nResults?.message}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions — mobile: sticky bottom bar */}
          <div className="flex items-center justify-between gap-3 py-3 lg:pb-0">
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={fillExample}>
                <Beaker className="h-3.5 w-3.5" />
                Fill example
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => reset(DEFAULT_VALUES)}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
            <Button
              type="submit"
              size="lg"
              loading={createDesign.isPending}
              className="min-w-[140px]"
            >
              Design
            </Button>
          </div>
        </div>

        {/* Right: summary panel */}
        <div className="hidden lg:block">
          <SummaryPanel values={formValues} />
        </div>

        {/* Mobile: summary stacks below */}
        <div className="lg:hidden">
          <SummaryPanel values={formValues} />
        </div>
      </div>
    </form>
  )
}
