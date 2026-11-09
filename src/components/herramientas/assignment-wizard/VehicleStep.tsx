/**
 * Paso «Vehículo» del asistente móvil. Flujo ordenado Tipo → Marca → Modelo → Años,
 * y en cada nivel se puede agregar lo que falte o corregir lo existente:
 *
 *  - Nueva marca (con su tipo) → abre directamente «Nuevo modelo».
 *  - Editar marca: nombre y tipo. Renombrar actualiza también las asignaciones que la usan.
 *  - Nuevo modelo con su rango de años. Si ya existía, solo se agregan los años faltantes.
 *  - Renombrar modelo: también actualiza sus asignaciones.
 *  - Agregar años a un modelo (solo los que falten).
 *
 * Los cambios se aplican al momento a la base de vehículos (igual que en escritorio)
 * y dejan seleccionado lo recién creado para continuar sin pasos extra.
 */
import { useMemo, useState } from "react";
import { Check, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChipRow, FilterChip } from "@/design-system/detail/DetailScreen";
import { NativeSelectField } from "@/design-system/pickers";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@/data/carDatabase";
import type { ToolAssignment } from "@/types";
import {
  CATEGORY_LABELS, EMPTY_VEHICLE, MAX_NAME_LENGTH, clean, formatYearList, sameText,
  validateName, validateYearRange, yearInput,
  type VehicleEditor, type VehicleValue, type WizardVehicleDb,
} from "./wizardUtils";


interface VehicleStepProps {
  value: VehicleValue;
  onChange: (next: VehicleValue) => void;
  editor: VehicleEditor | null;
  onEditorChange: (editor: VehicleEditor | null) => void;
  onBusyChange: (busy: boolean) => void;
  vehicleDb: WizardVehicleDb;
  assignments: ToolAssignment[];
  onUpdateAssignment: (a: ToolAssignment) => Promise<boolean>;
  /** Error de validación del paso; se muestra solo tras intentar avanzar. */
  error: string | null;
}

const EDITOR_TITLES: Record<VehicleEditor, string> = {
  newMake: "Nueva marca",
  editMake: "Editar marca",
  newModel: "Nuevo modelo",
  editModel: "Renombrar modelo",
  addYears: "Agregar años",
};

function FieldError({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="text-xs font-medium text-destructive">{children}</p>;
}

function StepActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 pt-1">{children}</div>;
}

function ActionButton({ icon, children, onClick }: { icon: "add" | "edit"; children: React.ReactNode; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" size="sm" className="h-9 rounded-full px-3.5" onClick={onClick}>
      {icon === "add" ? <Plus className="mr-1 h-4 w-4" /> : <Pencil className="mr-1 h-3.5 w-3.5" />}
      {children}
    </Button>
  );
}

function SectionLabel({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] tabular-nums text-foreground">{index}</span>
      {children}
    </p>
  );
}

export function VehicleStep({
  value, onChange, editor, onEditorChange, onBusyChange, vehicleDb, assignments, onUpdateAssignment, error,
}: VehicleStepProps) {
  const [categoryFilter, setCategoryFilter] = useState<VehicleCategory | null>(null);
  const { make, model, yearStart, yearEnd } = value;

  const makeOptions = useMemo(() => {
    const list = categoryFilter ? vehicleDb.makes.filter((m) => vehicleDb.getMakeCategory(m) === categoryFilter) : vehicleDb.makes;
    // La marca elegida siempre debe verse, aunque no coincida con el filtro.
    return make && !list.includes(make) ? [make, ...list] : list;
  }, [vehicleDb, categoryFilter, make]);
  const models = useMemo(() => (make ? vehicleDb.getModelsByMake(make).filter(Boolean) : []), [make, vehicleDb]);
  const years = useMemo(() => (make && model ? vehicleDb.getYearsByMakeModel(make, model).filter((y) => y > 0) : []), [make, model, vehicleDb]);

  if (editor) {
    return (
      <VehicleEditorCard
        key={editor}
        kind={editor}
        value={value}
        defaultCategory={categoryFilter ?? "Vehiculo"}
        vehicleDb={vehicleDb}
        assignments={assignments}
        onUpdateAssignment={onUpdateAssignment}
        onBusyChange={onBusyChange}
        onChange={onChange}
        onEditorChange={onEditorChange}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <SectionLabel index={1}>Tipo</SectionLabel>
        <ChipRow label="Filtrar marcas por tipo">
          {VEHICLE_CATEGORIES.map((c) => (
            <FilterChip key={c} selected={categoryFilter === c} onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}>
              {CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </ChipRow>
      </section>

      <section className="space-y-2">
        <SectionLabel index={2}>Marca</SectionLabel>
        <NativeSelectField
          label={make ? `Marca · ${CATEGORY_LABELS[vehicleDb.getMakeCategory(make)]}` : "Marca"}
          value={make || null}
          placeholder={makeOptions.length ? "Elige la marca" : "Sin marcas de este tipo"}
          options={makeOptions.map((m) => ({ value: m }))}
          onChange={(v) => onChange({ ...EMPTY_VEHICLE, make: v })}
          disabled={makeOptions.length === 0}
        />
        <StepActions>
          <ActionButton icon="add" onClick={() => onEditorChange("newMake")}>Nueva marca</ActionButton>
          {make && <ActionButton icon="edit" onClick={() => onEditorChange("editMake")}>Editar marca</ActionButton>}
        </StepActions>
      </section>

      <section className="space-y-2">
        <SectionLabel index={3}>Modelo</SectionLabel>
        <NativeSelectField
          label="Modelo"
          value={model || null}
          placeholder={!make ? "Primero elige la marca" : models.length ? "Elige el modelo" : "Esta marca no tiene modelos"}
          options={models.map((m) => ({ value: m }))}
          onChange={(v) => onChange({ ...value, model: v, yearStart: "", yearEnd: "" })}
          disabled={!make || models.length === 0}
        />
        {make && (
          <StepActions>
            <ActionButton icon="add" onClick={() => onEditorChange("newModel")}>Nuevo modelo</ActionButton>
            {model && <ActionButton icon="edit" onClick={() => onEditorChange("editModel")}>Renombrar modelo</ActionButton>}
          </StepActions>
        )}
      </section>

      <section className="space-y-2">
        <SectionLabel index={4}>Años</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <NativeSelectField
            label="Desde"
            value={yearStart || null}
            placeholder="Año"
            options={years.filter((y) => !yearEnd || y <= Number(yearEnd)).map((y) => ({ value: String(y) }))}
            onChange={(v) => onChange({ ...value, yearStart: v })}
            disabled={!model || years.length === 0}
          />
          <NativeSelectField
            label="Hasta"
            value={yearEnd || null}
            placeholder="Año"
            options={years.filter((y) => !yearStart || y >= Number(yearStart)).map((y) => ({ value: String(y) }))}
            onChange={(v) => onChange({ ...value, yearEnd: v })}
            disabled={!model || years.length === 0}
          />
        </div>
        {model && (
          <p className="text-xs text-muted-foreground">
            {years.length ? <>Registrados: <span className="tabular-nums text-foreground">{formatYearList(years)}</span></> : "Este modelo aún no tiene años."}
          </p>
        )}
        {model && (
          <StepActions>
            <ActionButton icon="add" onClick={() => onEditorChange("addYears")}>Agregar años</ActionButton>
          </StepActions>
        )}
      </section>

      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

// ── Editor de un nivel (marca / modelo / años) ───────────────────────────────

interface EditorCardProps {
  kind: VehicleEditor;
  value: VehicleValue;
  defaultCategory: VehicleCategory;
  vehicleDb: WizardVehicleDb;
  assignments: ToolAssignment[];
  onUpdateAssignment: (a: ToolAssignment) => Promise<boolean>;
  onBusyChange: (busy: boolean) => void;
  onChange: (next: VehicleValue) => void;
  onEditorChange: (editor: VehicleEditor | null) => void;
}

function VehicleEditorCard({
  kind, value, defaultCategory, vehicleDb, assignments, onUpdateAssignment, onBusyChange, onChange, onEditorChange,
}: EditorCardProps) {
  const { make, model } = value;
  const [name, setName] = useState(kind === "editMake" ? make : kind === "editModel" ? model : "");
  const [category, setCategory] = useState<VehicleCategory>(kind === "editMake" ? vehicleDb.getMakeCategory(make) : defaultCategory);
  const [ys, setYs] = useState("");
  const [ye, setYe] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const existingYears = useMemo(
    () => (make && model ? vehicleDb.getYearsByMakeModel(make, model).filter((y) => y > 0) : []),
    [make, model, vehicleDb],
  );

  /** Asignaciones que dependen del nombre que se va a renombrar. */
  const affected = useMemo(() => {
    if (kind === "editMake") return assignments.filter((a) => sameText(clean(a.make), make));
    if (kind === "editModel") return assignments.filter((a) => sameText(clean(a.make), make) && sameText(clean(a.model), model));
    return [];
  }, [kind, assignments, make, model]);

  const needsName = kind !== "addYears";
  const needsYears = kind === "newModel" || kind === "addYears";
  const nameError = needsName ? validateName(name, kind === "newMake" || kind === "editMake" ? "la marca" : "el modelo") : null;
  const yearsError = needsYears ? validateYearRange(ys, ye) : null;

  const close = () => { if (!saving) onEditorChange(null); };

  const updateAffected = async (patch: (a: ToolAssignment) => ToolAssignment) => {
    if (!affected.length) return;
    const results = await Promise.all(affected.map((a) => onUpdateAssignment(patch(a)).catch(() => false)));
    const failed = results.filter((ok) => !ok).length;
    if (failed) toast.error(`${failed} asignación(es) no se pudieron actualizar con el nuevo nombre. Revísalas desde una PC.`);
  };

  const submit = async () => {
    if (saving) return;
    setShowErrors(true);
    if (nameError || yearsError) { toast.error(nameError ?? yearsError!); return; }
    const newName = clean(name);
    const range = needsYears ? { start: Number(ys), end: Number(ye) } : null;

    switch (kind) {
      case "newMake": {
        const existing = vehicleDb.makes.find((m) => sameText(m, newName));
        if (existing) {
          onChange({ ...EMPTY_VEHICLE, make: existing });
          onEditorChange(null);
          toast.info(`La marca «${existing}» ya existía; quedó seleccionada.`);
          return;
        }
        vehicleDb.addMake(newName, category);
        onChange({ ...EMPTY_VEHICLE, make: newName });
        // Una marca sin modelos no sirve para asignar: se pasa directo a crear el primero.
        onEditorChange("newModel");
        toast.success(`Marca «${newName}» agregada. Ahora agrega su primer modelo.`);
        return;
      }

      case "editMake": {
        const currentCategory = vehicleDb.getMakeCategory(make);
        const renamed = newName !== make;
        if (renamed && vehicleDb.makes.some((m) => m !== make && sameText(m, newName))) {
          toast.error(`Ya existe otra marca llamada «${newName}».`);
          return;
        }
        if (!renamed && category === currentCategory) { onEditorChange(null); return; }
        setSaving(true); onBusyChange(true);
        if (renamed) vehicleDb.renameMake(make, newName);
        if (category !== currentCategory) vehicleDb.setCategoryForMake(newName, category);
        if (renamed) await updateAffected((a) => ({ ...a, make: newName }));
        setSaving(false); onBusyChange(false);
        onChange({ ...value, make: newName });
        onEditorChange(null);
        toast.success("Marca actualizada.");
        return;
      }

      case "newModel": {
        const existing = vehicleDb.getModelsByMake(make).find((m) => sameText(m, newName));
        const target = existing ?? newName;
        const have = new Set(existing ? vehicleDb.getYearsByMakeModel(make, existing) : []);
        const missing = range!.end - range!.start + 1 - [...have].filter((y) => y >= range!.start && y <= range!.end).length;
        if (missing > 0) vehicleDb.addModel(make, target, range!.start, range!.end);
        onChange({ make, model: target, yearStart: ys, yearEnd: ye });
        onEditorChange(null);
        toast.success(
          existing
            ? missing > 0 ? `«${existing}» ya existía; se agregaron ${missing} año(s) faltante(s).` : `«${existing}» ya existía con esos años; quedó seleccionado.`
            : `Modelo «${newName}» agregado (${ys}–${ye}).`,
        );
        return;
      }

      case "editModel": {
        const renamed = newName !== model;
        if (!renamed) { onEditorChange(null); return; }
        if (vehicleDb.getModelsByMake(make).some((m) => m !== model && sameText(m, newName))) {
          toast.error(`Ya existe otro modelo «${newName}» en ${make}.`);
          return;
        }
        setSaving(true); onBusyChange(true);
        vehicleDb.renameModel(make, model, newName);
        await updateAffected((a) => ({ ...a, make, model: newName }));
        setSaving(false); onBusyChange(false);
        onChange({ ...value, model: newName });
        onEditorChange(null);
        toast.success("Modelo actualizado.");
        return;
      }

      case "addYears": {
        const have = new Set(existingYears);
        let missing = 0;
        for (let y = range!.start; y <= range!.end; y++) if (!have.has(y)) missing++;
        if (missing > 0) vehicleDb.addModel(make, model, range!.start, range!.end);
        onChange({ ...value, yearStart: ys, yearEnd: ye });
        onEditorChange(null);
        toast.success(missing > 0 ? `Se agregaron ${missing} año(s) a ${make} ${model}.` : "Esos años ya existían; quedaron seleccionados.");
        return;
      }
    }
  };

  const context = kind === "newMake" ? "Se agregará a la base de vehículos" : kind === "editMake" ? make : `${make}${kind === "newModel" ? "" : ` ${model}`}`;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-card p-4 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{EDITOR_TITLES[kind]}</h2>
          <p className="text-xs text-muted-foreground">{context}</p>
        </div>

        {needsName && (
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-editor-name">{kind === "newMake" || kind === "editMake" ? "Nombre de la marca" : "Nombre del modelo"}</Label>
            <Input
              id="vehicle-editor-name"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              autoCapitalize="words"
              autoComplete="off"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !needsYears) submit(); }}
              placeholder={kind === "newMake" || kind === "editMake" ? "Toyota, Honda…" : "Corolla, Civic…"}
              aria-invalid={showErrors && !!nameError}
            />
            {showErrors && nameError && <FieldError>{nameError}</FieldError>}
          </div>
        )}

        {(kind === "newMake" || kind === "editMake") && (
          <ChipRow label="Tipo de vehículo">
            {VEHICLE_CATEGORIES.map((c) => (
              <FilterChip key={c} onCard selected={category === c} onClick={() => setCategory(c)}>{CATEGORY_LABELS[c]}</FilterChip>
            ))}
          </ChipRow>
        )}

        {needsYears && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vehicle-editor-ys">Año inicio</Label>
                <Input id="vehicle-editor-ys" inputMode="numeric" value={ys} onChange={(e) => setYs(yearInput(e.target.value))} placeholder="2015" aria-invalid={showErrors && !!yearsError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vehicle-editor-ye">Año fin</Label>
                <Input id="vehicle-editor-ye" inputMode="numeric" value={ye} onChange={(e) => setYe(yearInput(e.target.value))} placeholder="2020" aria-invalid={showErrors && !!yearsError} />
              </div>
            </div>
            {showErrors && yearsError && <FieldError>{yearsError}</FieldError>}
            {kind === "addYears" && (
              <p className="text-xs text-muted-foreground">
                {existingYears.length ? <>Ya registrados: <span className="tabular-nums text-foreground">{formatYearList(existingYears)}</span>. Solo se agregan los que falten.</> : "Este modelo aún no tiene años."}
              </p>
            )}
          </div>
        )}

        {affected.length > 0 && (
          <p className="rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            {affected.length} asignación(es) usan este nombre; se actualizarán automáticamente al renombrar.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={close} disabled={saving}>Cancelar</Button>
        <Button type="button" className="flex-1 rounded-full" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
