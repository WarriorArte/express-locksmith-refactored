import  {  useState,  useMemo,  useRef  }  from"react";
import  {  m  as  motion  }  from"framer-motion";
import  {
  Plus,  Trash2,  Edit,  ArrowLeft,  Check,  Search,
  ImageIcon,  Car,  X,  ChevronDown,  Cpu,  Radio,
  ShieldCheck,  Wrench,  ChevronUp,
}  from"lucide-react";
import  {  toast  }  from"sonner";

import  {  Button  }  from"@/components/ui/button";
import  {  Input  }  from"@/components/ui/input";
import  {  Card,  CardContent  }  from"@/components/ui/card";
import  {  Badge  }  from"@/components/ui/badge";
import  {  Label  }  from"@/components/ui/label";
import  {  Separator  }  from"@/components/ui/separator";
import  {  Checkbox  }  from"@/components/ui/checkbox";
import  {  Textarea  }  from"@/components/ui/textarea";

import  type  {
  ImmoProfile,  ImmoGenField,  ImmoCatalogItem,
  ImmoAssignmentDetail,  ToolAssignment,
}  from"@/types";

//  ──  helpers  ───────────────────────────────────────────────────────────────────

function  uid()  {  return  crypto.randomUUID();  }

function  emptyProfile():  Omit<ImmoProfile,"id"  |"dateAdded">  {
  return  {
  marca:"",
  fccId:"",
  frecuencia:"",
  bateria:"",
  mainImage:  undefined,
  generacionRemoto:  [
  {  id:  uid(),  label:"Keydiy  ID",  value:""  },
  {  id:  uid(),  label:"Xhorse  ID",  value:""  },
  ],
  };
}

function  emptyDetail():  Omit<ImmoAssignmentDetail,"profileId">  {
  return  {
  transponder:"",
  generadoConIds:  [],
  equiposRemotoIds:  [],
  equiposTransponderIds:  [],
  programacionManual:  false,
  programacionOBD:  false,
  procedimientoProgramacion:"",
  };
}

function  fileToBase64(file:  File):  Promise<string>  {
  return  new  Promise((resolve,  reject)  =>  {
  const  reader  =  new  FileReader();
  reader.onload  =  ()  =>  resolve(reader.result  as  string);
  reader.onerror  =  reject;
  reader.readAsDataURL(file);
  });
}

function  profileTitle(p:  Pick<ImmoProfile,"marca"  |"fccId">)  {
  const  parts  =  [p.marca,  p.fccId].filter(Boolean);
  return  parts.length  ?  parts.join("")  :"Sin  título";
}

//  ──  CatalogChipSelector  ───────────────────────────────────────────────────────

interface  CatalogChipSelectorProps  {
  catalogItems:  ImmoCatalogItem[];
  selectedIds?:  string[];
  onChange:  (ids:  string[])  =>  void;
  emptyMessage?:  string;
}

function  CatalogChipSelector({  catalogItems,  selectedIds  =  [],  onChange,  emptyMessage  }:  CatalogChipSelectorProps)  {
  const  safeIds  =  selectedIds  ??  [];
  const  toggle  =  (id:  string)  =>
  onChange(safeIds.includes(id)  ?  safeIds.filter((x)  =>  x  !==  id)  :  [...safeIds,  id]);

  if  (catalogItems.length  ===  0)  {
  return  (
  <p  className="text-xs  text-muted-foreground  italic">
  {emptyMessage  ??"Sin  elementos  en  el  catálogo.  Agrégalos  en  «Herramientas  y  Suministros»."}
  </p>
  );
  }
  return  (
  <div  className="flex  flex-wrap  gap-2">
  {catalogItems.map((item)  =>  {
  const  active  =  safeIds.includes(item.id);
  return  (
  <button  key={item.id}  type="button"  onClick={()  =>  toggle(item.id)}
  className={`flex  items-center  gap-1.5  px-2.5  py-1  rounded-md  border  text-xs  font-semibold  transition-colors  ${
  active
  ?"bg-primary  text-primary-foreground  border-primary"
  :"bg-muted/60  text-muted-foreground  border-input  hover:bg-muted"
  }`}>
  {item.image  &&  <img  src={item.image}  alt=""  className="w-4  h-4  rounded  object-cover"  />}
  {active  &&  <Check  className="w-3  h-3  shrink-0"  />}
  {item.label}
  </button>
  );
  })}
  </div>
  );
}

//  ──  GenFieldList  ──────────────────────────────────────────────────────────────

function  GenFieldList({  fields,  onChange  }:  {  fields:  ImmoGenField[];  onChange:  (f:  ImmoGenField[])  =>  void  })  {
  const  [newLabel,  setNewLabel]  =  useState("");
  const  update  =  (id:  string,  key:"label"  |"value",  val:  string)  =>
  onChange(fields.map((f)  =>  (f.id  ===  id  ?  {  ...f,  [key]:  val  }  :  f)));
  const  remove  =  (id:  string)  =>  onChange(fields.filter((f)  =>  f.id  !==  id));
  const  add  =  ()  =>  {
  const  label  =  newLabel.trim();
  if  (!label)  return;
  onChange([...fields,  {  id:  uid(),  label,  value:""  }]);
  setNewLabel("");
  };
  return  (
  <div  className="space-y-2">
  {fields.map((f)  =>  (
  <div  key={f.id}  className="flex  items-center  gap-2">
  <Input  value={f.label}  onChange={(e)  =>  update(f.id,"label",  e.target.value)}  placeholder="Nombre"  className="h-8  w-28  text-xs  font-semibold"  />
  <span  className="text-muted-foreground  text-xs  shrink-0">:</span>
  <Input  value={f.value}  onChange={(e)  =>  update(f.id,"value",  e.target.value)}  placeholder="Valor"  className="h-8  flex-1  text-xs  font-mono"  />
  <Button  type="button"  variant="ghost"  size="icon"  className="h-7  w-7  text-destructive  hover:text-destructive  shrink-0"  onClick={()  =>  remove(f.id)}  disabled={fields.length  <=  1}>
  <Trash2  className="w-3.5  h-3.5"  />
  </Button>
  </div>
  ))}
  <div  className="flex  items-center  gap-1  pt-1">
  <Input  value={newLabel}  onChange={(e)  =>  setNewLabel(e.target.value)}  onKeyDown={(e)  =>  e.key  ==="Enter"  &&  add()}  placeholder="Nuevo  campo  (ej.  Autel  ID)…"  className="h-7  text-xs  flex-1  max-w-xs"  />
  <Button  type="button"  variant="outline"  size="sm"  className="h-7  text-xs  shrink-0"  onClick={add}  disabled={!newLabel.trim()}>
  <Plus  className="w-3  h-3  mr-1"  />  Agregar
  </Button>
  </div>
  </div>
  );
}

//  ──  Section  wrapper  ────────────────────────────────────────────────────────────

function  Section({  icon,  title,  children  }:  {  icon:  React.ReactNode;  title:  string;  children:  React.ReactNode  })  {
  return  (
  <div  className="space-y-3">
  <div  className="flex  items-center  gap-2">
  <div  className="text-primary">{icon}</div>
  <h3  className="text-xs  font-bold  uppercase  tracking-wider  text-muted-foreground">{title}</h3>
  <div  className="flex-1  h-px  bg-border"  />
  </div>
  {children}
  </div>
  );
}

//  ──  ImmoProfileEditor  ─────────────────────────────────────────────────────────

interface  ImmoProfileEditorProps  {
  draft:  Omit<ImmoProfile,"id"  |"dateAdded">;
  onChange:  (draft:  Omit<ImmoProfile,"id"  |"dateAdded">)  =>  void;
}

function  ImmoProfileEditor({  draft,  onChange  }:  ImmoProfileEditorProps)  {
  const  mainImgRef  =  useRef<HTMLInputElement>(null);
  const  set  =  <K  extends  keyof  typeof  draft>(key:  K,  val:  (typeof  draft)[K])  =>  onChange({  ...draft,  [key]:  val  });

  const  handleMainImage  =  async  (e:  React.ChangeEvent<HTMLInputElement>)  =>  {
  const  file  =  e.target.files?.[0];
  if  (!file)  return;
  if  (file.size  >  5  *  1024  *  1024)  {  toast.error("Imagen  máx  5  MB");  return;  }
  try  {  set("mainImage",  await  fileToBase64(file));  }  catch  {  toast.error("Error  al  cargar  imagen");  }
  e.target.value  ="";
  };

  return  (
  <div  className="space-y-6  pb-6">
  {/*  Main  image  */}
  <Section  icon={<ImageIcon  className="w-4  h-4"  />}  title="Imagen  Principal">
  <input  ref={mainImgRef}  type="file"  accept="image/*"  className="hidden"  onChange={handleMainImage}  />
  {draft.mainImage  ?  (
  <div  className="space-y-2">
  <div  className="rounded-lg  border  border-border  bg-muted/30  flex  items-center  justify-center  p-3  max-h-48  overflow-hidden">
  <img  src={draft.mainImage}  alt="Imagen  principal"  className="max-w-full  max-h-40  object-contain  rounded"  />
  </div>
  <div  className="flex  gap-2">
  <Button  variant="outline"  size="sm"  onClick={()  =>  mainImgRef.current?.click()}>
  <ImageIcon  className="w-3.5  h-3.5  mr-1.5"  />  Cambiar
  </Button>
  <Button  variant="outline"  size="sm"  className="text-destructive  border-destructive/40  hover:bg-destructive/10"  onClick={()  =>  set("mainImage",  undefined)}>
  <Trash2  className="w-3.5  h-3.5  mr-1.5"  />  Quitar
  </Button>
  </div>
  </div>
  )  :  (
  <button  type="button"  onClick={()  =>  mainImgRef.current?.click()}  className="w-full  border-2  border-dashed  border-border  rounded-xl  py-8  flex  flex-col  items-center  gap-2  text-muted-foreground  hover:border-primary/40  hover:text-primary/60  transition-colors">
  <ImageIcon  className="w-8  h-8  opacity-30"  />
  <span  className="text-sm  font-medium">Haz  clic  para  subir  imagen</span>
  <span  className="text-xs  opacity-70">PNG,  JPG,  WEBP  ·  máx  5  MB</span>
  </button>
  )}
  </Section>

  <Separator  />

  {/*  Detalles  del  remoto  */}
  <Section  icon={<Radio  className="w-4  h-4"  />}  title="Detalles  del  Remoto">
  <div  className="grid  grid-cols-1  sm:grid-cols-2  gap-3">
  {([["marca","Marca","Toyota,  Honda…",""],  ["fccId","FCC  ID","HYQ12BFB…","font-mono"],  ["frecuencia","Frecuencia","433  MHz…",""],  ["bateria","Batería","CR2032…",""]]  as  const).map(([key,  lbl,  ph,  cls])  =>  (
  <div  key={key}  className="space-y-1">
  <Label  className="text-xs  font-bold">{lbl}</Label>
  <Input  value={draft[key]}  onChange={(e)  =>  set(key,  e.target.value)}  placeholder={ph}  className={`h-8  text-sm  ${cls}`}  />
  </div>
  ))}
  </div>
  </Section>

  <Separator  />

  {/*  Generación  de  remoto  */}
  <Section  icon={<Wrench  className="w-4  h-4"  />}  title="Generación  de  Remoto">
  <GenFieldList  fields={draft.generacionRemoto}  onChange={(v)  =>  set("generacionRemoto",  v)}  />
  </Section>
  </div>
  );
}

//  ──  ImmoManager  ───────────────────────────────────────────────────────────────

type  View  ="list"  |"edit";

interface  ImmoManagerProps  {
  profiles:  ImmoProfile[];
  onSave:  (p:  ImmoProfile)  =>  void;
  onUpdate:  (p:  ImmoProfile)  =>  void;
  onDelete:  (id:  string)  =>  void;
  catalog:  ImmoCatalogItem[];
}

export  function  ImmoManager({  profiles,  onSave,  onUpdate,  onDelete,  catalog:  _catalog  }:  ImmoManagerProps)  {
  const  [view,  setView]  =  useState<View>("list");
  const  [editingId,  setEditingId]  =  useState<string  |  null>(null);
  const  [draft,  setDraft]  =  useState<Omit<ImmoProfile,"id"  |"dateAdded">>(emptyProfile());
  const  [isNew,  setIsNew]  =  useState(false);
  const  [search,  setSearch]  =  useState("");

  const  openNew  =  ()  =>  {  setDraft(emptyProfile());  setEditingId(null);  setIsNew(true);  setView("edit");  };

  const  openEdit  =  (p:  ImmoProfile)  =>  {
  const  {  id,  dateAdded,  ...rest  }  =  p;
  setDraft({  ...rest,  generacionRemoto:  rest.generacionRemoto  ??  []  });
  setEditingId(id);  setIsNew(false);  setView("edit");
  };

  const  handleSave  =  ()  =>  {
  if  (!draft.marca.trim()  &&  !draft.fccId.trim())  {  toast.error("Ingresa  al  menos  Marca  o  FCC  ID.");  return;  }
  if  (isNew)  {
  onSave({  id:  uid(),  dateAdded:  new  Date().toLocaleDateString(),  ...draft  });
  toast.success("Perfil  Immo  creado.");
  }  else  if  (editingId)  {
  const  orig  =  profiles.find((p)  =>  p.id  ===  editingId);
  onUpdate({  id:  editingId,  dateAdded:  orig?.dateAdded  ??  new  Date().toLocaleDateString(),  ...draft  });
  toast.success("Perfil  actualizado.");
  }
  setView("list");
  };

  const  filtered  =  useMemo(()  =>  {
  if  (!search.trim())  return  profiles;
  const  q  =  search.toLowerCase();
  return  profiles.filter((p)  =>  p.marca.toLowerCase().includes(q)  ||  p.fccId.toLowerCase().includes(q));
  },  [profiles,  search]);

  if  (view  ==="list")  {
  return  (
  <div  className="space-y-4">
  <div  className="flex  items-center  gap-3  flex-wrap">
  <div  className="mr-auto">
  <h2  className="text-lg  font-bold  text-foreground">Perfiles  Immo</h2>
  <p  className="text-sm  text-muted-foreground">{profiles.length}  perfil(es)</p>
  </div>
  <div  className="relative">
  <Search  className="absolute  left-2.5  top-1/2  -translate-y-1/2  w-4  h-4  text-muted-foreground  pointer-events-none"  />
  <Input  placeholder="Buscar  marca,  FCC  ID…"  value={search}  onChange={(e)  =>  setSearch(e.target.value)}  className="pl-9  w-56"  />
  </div>
  <Button  onClick={openNew}><Plus  className="w-4  h-4  mr-2"  />  Nueva  entrada</Button>
  </div>

  {profiles.length  ===  0  ?  (
  <Card><CardContent  className="py-16  text-center  text-muted-foreground">
  <Cpu  className="w-12  h-12  mx-auto  mb-3  opacity-20"  />
  <p  className="font-semibold  text-foreground">No  hay  perfiles  Immo</p>
  <p  className="text-sm  mt-1">Usa"Nueva  entrada"  para  crear  el  primero.</p>
  </CardContent></Card>
  )  :  filtered.length  ===  0  ?  (
  <Card><CardContent  className="py-12  text-center  text-muted-foreground">
  <Search  className="w-10  h-10  mx-auto  mb-3  opacity-20"  />
  <p  className="font-semibold  text-foreground">Sin  resultados  para"{search}".</p>
  </CardContent></Card>
  )  :  (
  <div  className="space-y-2">
  {filtered.map((p)  =>  (
  <motion.div  key={p.id}  initial={{  opacity:  0,  y:  6  }}  animate={{  opacity:  1,  y:  0  }}  className="flex  items-center  gap-4  p-4  rounded-lg  border  border-border  bg-card  hover:border-primary/30  transition-colors">
  {p.mainImage  ?  (
  <div  className="w-12  h-10  rounded-md  overflow-hidden  border  border-border  bg-muted/30  shrink-0">
  <img  src={p.mainImage}  alt=""  className="w-full  h-full  object-cover"  />
  </div>
  )  :  (
  <div  className="w-12  h-10  rounded-md  bg-primary/10  flex  items-center  justify-center  shrink-0">
  <Cpu  className="w-5  h-5  text-primary"  />
  </div>
  )}
  <div  className="flex-1  min-w-0">
  <div  className="flex  items-center  gap-2  flex-wrap">
  <span  className="font-bold  text-foreground">{profileTitle(p)}</span>
  {p.frecuencia  &&  <Badge  variant="secondary">{p.frecuencia}</Badge>}
  </div>
  <p  className="text-xs  text-muted-foreground  mt-0.5">{p.bateria  &&  `Batería:  ${p.bateria}  ·  `}{p.dateAdded}</p>
  </div>
  <div  className="flex  gap-1  shrink-0">
  <Button  variant="ghost"  size="icon"  className="h-8  w-8"  onClick={()  =>  openEdit(p)}>
  <Edit  className="w-4  h-4"  />
  </Button>
  <Button  variant="ghost"  size="icon"  className="h-8  w-8  text-destructive  hover:text-destructive"  onClick={()  =>  {  onDelete(p.id);  toast.success("Perfil  eliminado.");  }}>
  <Trash2  className="w-4  h-4"  />
  </Button>
  </div>
  </motion.div>
  ))}
  </div>
  )}
  </div>
  );
  }

  const  title  =  isNew  ?"Nueva  entrada  Immo"  :  profileTitle(draft);
  return  (
  <div  className="h-[calc(100dvh-4rem-2rem)]  flex  flex-col">
  <div  className="flex  items-center  justify-between  gap-3  pb-3  shrink-0">
  <div  className="flex  items-center  gap-2  min-w-0">
  <button  onClick={()  =>  setView("list")}  className="text-primary  hover:text-primary/80  transition-colors  shrink-0">
  <ArrowLeft  className="w-5  h-5"  />
  </button>
  <div  className="min-w-0">
  <h2  className="text-sm  font-bold  text-foreground  truncate">{title}</h2>
  <p  className="text-xs  text-muted-foreground">{isNew  ?"Creando  perfil"  :"Editando  perfil"}</p>
  </div>
  </div>
  <Button  onClick={handleSave}  size="sm"  className="shrink-0">
  <Check  className="w-4  h-4  mr-1"  />  Guardar
  </Button>
  </div>
  <div  className="flex-1  min-h-0  overflow-y-auto  pr-1  custom-scrollbar">
  <ImmoProfileEditor  draft={draft}  onChange={setDraft}  />
  </div>
  </div>
  );
}

//  ──  ImmoAssignmentManager  ─────────────────────────────────────────────────────

interface  VehicleDbRef  {
  makes:  string[];
  getModelsByMake:  (make:  string)  =>  string[];
  getYearsByMakeModel:  (make:  string,  model:  string)  =>  number[];
}

type  DetailMap  =  Record<string,  Omit<ImmoAssignmentDetail,"profileId">>;

interface  ImmoAssignmentManagerProps  {
  immoProfiles:  ImmoProfile[];
  assignments:  ToolAssignment[];
  onSave:  (a:  ToolAssignment)  =>  void;
  onUpdate:  (a:  ToolAssignment)  =>  void;
  onDelete:  (id:  string)  =>  void;
  vehicleDb:  VehicleDbRef;
  catalog:  ImmoCatalogItem[];
}

const  PAGE_SIZE  =  20;

export  function  ImmoAssignmentManager({
  immoProfiles,  assignments,  onSave,  onUpdate,  onDelete,  vehicleDb,  catalog,
}:  ImmoAssignmentManagerProps)  {
  const  [make,  setMake]  =  useState("");
  const  [model,  setModel]  =  useState("");
  const  [yearStart,  setYearStart]  =  useState("");
  const  [yearEnd,  setYearEnd]  =  useState("");
  const  [selectedIds,  setSelectedIds]  =  useState<string[]>([]);
  const  [detailMap,  setDetailMap]  =  useState<DetailMap>({});
  const  [expandedProfileId,  setExpandedProfileId]  =  useState<string  |  null>(null);
  const  [profileSearch,  setProfileSearch]  =  useState("");
  const  [isDropdownOpen,  setIsDropdownOpen]  =  useState(false);
  const  [editingId,  setEditingId]  =  useState<string  |  null>(null);
  const  [searchQuery,  setSearchQuery]  =  useState("");
  const  [page,  setPage]  =  useState(0);

  const  transponderCatalog  =  useMemo(()  =>  catalog.filter((i)  =>  i.category  ==="transponder"),  [catalog]);
  const  equipoCatalog  =  useMemo(()  =>  catalog.filter((i)  =>  i.category  ==="equipo"),  [catalog]);

  const  immoAssignments  =  useMemo(
  ()  =>  assignments.filter((a)  =>  (a.immoDetails?.length  ??  0)  >  0),
  [assignments]
  );

  const  models  =  useMemo(()  =>  vehicleDb.getModelsByMake(make),  [make,  vehicleDb]);
  const  years  =  useMemo(()  =>  vehicleDb.getYearsByMakeModel(make,  model),  [make,  model,  vehicleDb]);

  const  updateDetail  =  (profileId:  string,  key:  keyof  Omit<ImmoAssignmentDetail,"profileId">,  value:  unknown)  =>  {
  setDetailMap((prev)  =>  ({
  ...prev,
  [profileId]:  {  ...(prev[profileId]  ??  emptyDetail()),  [key]:  value  },
  }));
  };

  const  toggleProfile  =  (id:  string)  =>  {
  if  (selectedIds.includes(id))  {
  setSelectedIds((prev)  =>  prev.filter((x)  =>  x  !==  id));
  setDetailMap((prev)  =>  {  const  next  =  {  ...prev  };  delete  next[id];  return  next;  });
  if  (expandedProfileId  ===  id)  setExpandedProfileId(null);
  }  else  {
  setSelectedIds((prev)  =>  [...prev,  id]);
  setDetailMap((prev)  =>  prev[id]  ?  prev  :  {  ...prev,  [id]:  emptyDetail()  });
  setExpandedProfileId(id);
  }
  };

  const  resetForm  =  ()  =>  {
  setMake("");  setModel("");  setYearStart("");  setYearEnd("");
  setSelectedIds([]);  setDetailMap({});  setExpandedProfileId(null);  setEditingId(null);
  };

  const  loadForEdit  =  (a:  ToolAssignment)  =>  {
  setMake(a.make);  setModel(a.model);
  setYearStart(a.yearStart.toString());  setYearEnd(a.yearEnd.toString());
  const  details  =  a.immoDetails  ??  [];
  setSelectedIds(details.map((d)  =>  d.profileId));
  const  map:  DetailMap  =  {};
  details.forEach((d)  =>  {
  map[d.profileId]  =  {
  transponder:  d.transponder,
  generadoConIds:  d.generadoConIds  ??  [],
  equiposRemotoIds:  d.equiposRemotoIds  ??  [],
  equiposTransponderIds:  d.equiposTransponderIds  ??  [],
  programacionManual:  d.programacionManual,
  programacionOBD:  d.programacionOBD,
  procedimientoProgramacion:  d.procedimientoProgramacion,
  };
  });
  setDetailMap(map);
  setExpandedProfileId(details[0]?.profileId  ??  null);
  setEditingId(a.id);
  };

  const  handleSubmit  =  ()  =>  {
  if  (!make  ||  !model  ||  !yearStart  ||  !yearEnd)  {  toast.error("Selecciona  marca,  modelo  y  rango  de  años.");  return;  }
  if  (selectedIds.length  ===  0)  {  toast.error("Selecciona  al  menos  un  perfil  Immo.");  return;  }
  const  immoDetails:  ImmoAssignmentDetail[]  =  selectedIds.map((id)  =>  ({
  profileId:  id,
  ...(detailMap[id]  ??  emptyDetail()),
  }));
  const  orig  =  editingId  ?  assignments.find((a)  =>  a.id  ===  editingId)  :  undefined;
  const  base:  ToolAssignment  =  {
  id:  editingId  ??  uid(),
  make,  model,
  yearStart:  parseInt(yearStart),
  yearEnd:  parseInt(yearEnd),
  tools:  ["immo"],
  workshops:  [],
  dateAdded:  orig?.dateAdded  ??  new  Date().toLocaleDateString(),
  keycodeProfileIds:  orig?.keycodeProfileIds  ??  [],
  immoDetails,
  };
  if  (editingId)  {  onUpdate(base);  toast.success("Asignación  actualizada.");  }
  else  {  onSave(base);  toast.success("Asignación  creada.");  }
  resetForm();
  };

  const  filtered  =  useMemo(()  =>  {
  if  (!searchQuery.trim())  return  immoAssignments;
  const  q  =  searchQuery.toLowerCase();
  return  immoAssignments.filter((a)  =>
  a.make.toLowerCase().includes(q)  ||  a.model.toLowerCase().includes(q)  ||
  `${a.yearStart}`.includes(q)  ||  `${a.yearEnd}`.includes(q)
  );
  },  [immoAssignments,  searchQuery]);

  const  totalPages  =  Math.max(1,  Math.ceil(filtered.length  /  PAGE_SIZE));
  const  safePage  =  Math.min(page,  totalPages  -  1);
  const  pageItems  =  filtered.slice(safePage  *  PAGE_SIZE,  (safePage  +  1)  *  PAGE_SIZE);

  const  selectClass  ="flex  h-9  w-full  rounded-md  border  border-input  bg-background  px-3  py-1  text-sm  ring-offset-background  focus-visible:outline-none  focus-visible:ring-2  focus-visible:ring-ring  disabled:cursor-not-allowed  disabled:opacity-50";

  return  (
  <div  className="grid  grid-cols-1  lg:grid-cols-12  gap-6  items-start">
  {/*  LEFT:  Form  */}
  <div  className="lg:col-span-7  space-y-4  sticky  top-6">
  <div  className="flex  flex-col  justify-center  h-auto  sm:h-[60px]  shrink-0">
  <h2  className="text-lg  font-bold  text-foreground  flex  items-center  gap-2  leading-none">
  <Car  className="w-5  h-5  text-primary"  />  {editingId  ?"Editar  Asignación"  :"Nueva  Asignación"}
  </h2>
  <p  className="text-xs  text-muted-foreground  mt-1.5">
  {editingId  ?"Actualiza  la  asignación."  :"Asigna  perfiles  Immo  a  un  vehículo  con  sus  datos  de  transponder  y  programación  específicos."}
  </p>
  </div>

  <Card  className={editingId  ?"border-primary  ring-1  ring-primary/20  shadow-sm"  :"border-primary/20"}>
  <CardContent  className="pt-4  pb-4  px-4  bg-primary/5  rounded-[inherit]  space-y-4">
  {/*  Vehicle  */}
  <div  className="space-y-2">
  <p  className="text-xs  font-bold  text-muted-foreground  uppercase  tracking-wider  flex  items-center  gap-1.5">
  <Car  className="w-3.5  h-3.5"  />  Vehículo
  </p>
  <div  className="grid  grid-cols-2  gap-2">
  <select  value={make}  onChange={(e)  =>  {  setMake(e.target.value);  setModel("");  setYearStart("");  setYearEnd("");  }}  className={selectClass}>
  <option  value="">Marca…</option>
  {vehicleDb.makes.map((m)  =>  <option  key={m}  value={m}>{m}</option>)}
  </select>
  <select  value={model}  onChange={(e)  =>  {  setModel(e.target.value);  setYearStart("");  setYearEnd("");  }}  disabled={!make}  className={selectClass}>
  <option  value="">Modelo…</option>
  {models.map((m)  =>  <option  key={m}  value={m}>{m}</option>)}
  </select>
  <select  value={yearStart}  onChange={(e)  =>  setYearStart(e.target.value)}  disabled={!model}  className={selectClass}>
  <option  value="">Año  inicio…</option>
  {years.filter((y)  =>  !yearEnd  ||  y  <=  parseInt(yearEnd)).map((y)  =>  <option  key={y}  value={y}>{y}</option>)}
  </select>
  <select  value={yearEnd}  onChange={(e)  =>  setYearEnd(e.target.value)}  disabled={!model}  className={selectClass}>
  <option  value="">Año  fin…</option>
  {years.filter((y)  =>  !yearStart  ||  y  >=  parseInt(yearStart)).map((y)  =>  <option  key={y}  value={y}>{y}</option>)}
  </select>
  </div>
  </div>

  {/*  Profile  selector  */}
  <div  className="space-y-2">
  <p  className="text-xs  font-bold  text-muted-foreground  uppercase  tracking-wider  flex  items-center  gap-1.5">
  <Cpu  className="w-3.5  h-3.5"  />  Perfiles  Immo
  </p>
  <div  className="relative">
  <div
  className="flex  flex-wrap  min-h-[36px]  w-full  items-center  gap-1.5  rounded-md  border  border-input  bg-background  px-3  py-1.5  text-sm  cursor-pointer"
  onClick={()  =>  setIsDropdownOpen(!isDropdownOpen)}
  >
  {selectedIds.length  ===  0  ?  (
  <span  className="text-muted-foreground  py-0.5">Seleccionar  perfiles…</span>
  )  :  (
  selectedIds.map((id)  =>  {
  const  p  =  immoProfiles.find((x)  =>  x.id  ===  id);
  if  (!p)  return  null;
  return  (
  <span  key={id}  className="inline-flex  items-center  gap-1  bg-primary/10  text-primary  border  border-primary/20  px-2  py-0.5  rounded  text-xs  font-medium">
  {profileTitle(p)}
  <button  type="button"  onClick={(e)  =>  {  e.stopPropagation();  toggleProfile(id);  }}  className="text-primary  hover:text-primary/70">
  <X  className="w-3  h-3"  />
  </button>
  </span>
  );
  })
  )}
  <div  className="ml-auto  text-muted-foreground"><ChevronDown  className="w-4  h-4  opacity-50"  /></div>
  </div>
  {isDropdownOpen  &&  (
  <>
  <div  className="fixed  inset-0  z-40"  onClick={()  =>  setIsDropdownOpen(false)}  />
  <div  className="absolute  top-full  left-0  z-50  w-full  mt-1  bg-popover  text-popover-foreground  border  rounded-md  shadow-md">
  <div  className="p-2  border-b  flex  items-center  gap-2">
  <Search  className="w-4  h-4  text-muted-foreground  shrink-0"  />
  <input  autoFocus  type="text"  placeholder="Buscar  perfil…"  className="flex-1  bg-transparent  text-sm  outline-none"  value={profileSearch}  onChange={(e)  =>  setProfileSearch(e.target.value)}  />
  </div>
  <div  className="max-h-56  overflow-y-auto  p-1  custom-scrollbar">
  {immoProfiles.filter((p)  =>  profileTitle(p).toLowerCase().includes(profileSearch.toLowerCase())).map((p)  =>  {
  const  isSelected  =  selectedIds.includes(p.id);
  return  (
  <div  key={p.id}  onClick={()  =>  toggleProfile(p.id)}  className="flex  items-center  gap-2  px-2  py-1.5  rounded-sm  hover:bg-muted  cursor-pointer  text-sm">
  <div  className={`w-4  h-4  rounded-sm  border  shrink-0  flex  items-center  justify-center  ${isSelected  ?"bg-primary  border-primary  text-primary-foreground"  :"border-primary/50"}`}>
  {isSelected  &&  <Check  className="w-3  h-3"  />}
  </div>
  <span  className="font-medium  text-xs">{profileTitle(p)}</span>
  {p.frecuencia  &&  <span  className="text-muted-foreground  text-xs">·  {p.frecuencia}</span>}
  </div>
  );
  })}
  {immoProfiles.length  ===  0  &&  <div  className="p-4  text-center  text-sm  text-muted-foreground">No  hay  perfiles  Immo  creados  aún.</div>}
  </div>
  </div>
  </>
  )}
  </div>
  </div>

  {/*  Per-profile  detail  sections  */}
  {selectedIds.length  >  0  &&  (
  <div  className="space-y-2">
  <p  className="text-xs  font-bold  text-muted-foreground  uppercase  tracking-wider  flex  items-center  gap-1.5">
  <ShieldCheck  className="w-3.5  h-3.5"  />  Datos  por  Vehículo
  </p>
  {selectedIds.map((id)  =>  {
  const  p  =  immoProfiles.find((x)  =>  x.id  ===  id);
  if  (!p)  return  null;
  const  detail  =  detailMap[id]  ??  emptyDetail();
  const  isExpanded  =  expandedProfileId  ===  id;
  return  (
  <div  key={id}  className="rounded-lg  border  border-border  bg-background  overflow-hidden">
  {/*  Accordion  header  */}
  <button
  type="button"
  onClick={()  =>  setExpandedProfileId(isExpanded  ?  null  :  id)}
  className="w-full  flex  items-center  justify-between  px-3  py-2.5  text-left  hover:bg-muted/40  transition-colors"
  >
  <div  className="flex  items-center  gap-2  min-w-0">
  {p.mainImage  ?  (
  <img  src={p.mainImage}  className="w-6  h-6  rounded  object-cover  shrink-0"  alt=""  />
  )  :  (
  <Cpu  className="w-4  h-4  text-violet-500  shrink-0"  />
  )}
  <span  className="text-sm  font-semibold  text-foreground  truncate">{profileTitle(p)}</span>
  {detail.transponder  &&  (
  <span  className="text-xs  text-muted-foreground  font-mono">·  {detail.transponder}</span>
  )}
  </div>
  {isExpanded  ?  <ChevronUp  className="w-4  h-4  text-muted-foreground  shrink-0"  />  :  <ChevronDown  className="w-4  h-4  text-muted-foreground  shrink-0"  />}
  </button>

  {/*  Accordion  body  */}
  {isExpanded  &&  (
  <div  className="px-3  pb-4  space-y-4  border-t  border-border/50  pt-3">
  {/*  Transponder  */}
  <div  className="space-y-1">
  <Label  className="text-xs  font-bold">Transponder</Label>
  <Input  value={detail.transponder}  onChange={(e)  =>  updateDetail(id,"transponder",  e.target.value)}  placeholder="Philips  ID46…"  className="h-8  text-sm  font-mono"  />
  </div>
  {/*  Se  genera  con  */}
  <div  className="space-y-1.5">
  <Label  className="text-xs  font-bold">Se  genera  con</Label>
  <CatalogChipSelector  catalogItems={transponderCatalog}  selectedIds={detail.generadoConIds}  onChange={(ids)  =>  updateDetail(id,"generadoConIds",  ids)}  />
  </div>
  {/*  Equipos  remoto  */}
  <div  className="space-y-1.5">
  <Label  className="text-xs  font-bold">Equipos  —  Remoto</Label>
  <CatalogChipSelector  catalogItems={equipoCatalog}  selectedIds={detail.equiposRemotoIds}  onChange={(ids)  =>  updateDetail(id,"equiposRemotoIds",  ids)}  />
  </div>
  {/*  Equipos  transponder  */}
  <div  className="space-y-1.5">
  <Label  className="text-xs  font-bold">Equipos  —  Transponder</Label>
  <CatalogChipSelector  catalogItems={equipoCatalog}  selectedIds={detail.equiposTransponderIds}  onChange={(ids)  =>  updateDetail(id,"equiposTransponderIds",  ids)}  />
  </div>
  {/*  Programación  */}
  <div  className="flex  items-center  gap-6">
  <div  className="flex  items-center  gap-2">
  <Checkbox  id={`manual-${id}`}  checked={detail.programacionManual}  onCheckedChange={(v)  =>  updateDetail(id,"programacionManual",  !!v)}  />
  <Label  htmlFor={`manual-${id}`}  className="text-sm  cursor-pointer">Programación  manual</Label>
  </div>
  <div  className="flex  items-center  gap-2">
  <Checkbox  id={`obd-${id}`}  checked={detail.programacionOBD}  onCheckedChange={(v)  =>  updateDetail(id,"programacionOBD",  !!v)}  />
  <Label  htmlFor={`obd-${id}`}  className="text-sm  cursor-pointer">Programación  OBD</Label>
  </div>
  </div>
  <div  className="space-y-1">
  <Label  className="text-xs  font-bold">Procedimiento  de  Programación</Label>
  <Textarea  value={detail.procedimientoProgramacion}  onChange={(e)  =>  updateDetail(id,"procedimientoProgramacion",  e.target.value)}  placeholder="Describe  el  procedimiento  paso  a  paso…"  rows={4}  className="text-sm  resize-none"  />
  </div>
  </div>
  )}
  </div>
  );
  })}
  </div>
  )}

  <div  className="flex  gap-2  pt-1">
  <Button  onClick={handleSubmit}  className="flex-1">
  <Check  className="w-4  h-4  mr-1.5"  />  {editingId  ?"Guardar  Cambios"  :"Crear  Asignación"}
  </Button>
  {editingId  &&  <Button  variant="outline"  onClick={resetForm}><X  className="w-4  h-4  mr-1"  />  Cancelar</Button>}
  </div>
  </CardContent>
  </Card>
  </div>

  {/*  RIGHT:  List  */}
  <div  className="lg:col-span-5  space-y-4  min-w-0">
  <div  className="flex  flex-col  sm:flex-row  sm:items-center  justify-between  gap-3  bg-muted/30  px-3  py-2  rounded-lg  border  border-border  h-auto  sm:h-[60px]  shrink-0">
  <p  className="text-sm  text-muted-foreground  font-medium  whitespace-nowrap">Total:  {filtered.length}</p>
  <div  className="relative  flex-1  max-w-sm">
  <Search  className="absolute  left-2.5  top-1/2  -translate-y-1/2  w-4  h-4  text-muted-foreground"  />
  <Input  placeholder="Buscar  vehículo…"  value={searchQuery}  onChange={(e)  =>  {  setSearchQuery(e.target.value);  setPage(0);  }}  className="pl-8  w-full  h-8  bg-background  text-sm"  />
  </div>
  </div>

  {filtered.length  ===  0  ?  (
  <div  className="text-center  py-12  bg-muted/30  rounded-lg  border  border-dashed  border-border">
  <Car  className="w-10  h-10  mx-auto  mb-2  text-muted-foreground/50"  />
  <p  className="text-muted-foreground  font-medium">
  {immoAssignments.length  ===  0  ?"No  hay  asignaciones  Immo  creadas."  :"Sin  resultados  para  esta  búsqueda."}
  </p>
  </div>
  )  :  (
  <div  className="grid  grid-cols-1  sm:grid-cols-2  lg:grid-cols-1  xl:grid-cols-2  gap-3">
  {pageItems.map((item)  =>  {
  const  isEditing  =  editingId  ===  item.id;
  return  (
  <Card  key={item.id}  onClick={()  =>  !isEditing  &&  loadForEdit(item)}  className={`transition-all  overflow-hidden  cursor-pointer  ${isEditing  ?"ring-2  ring-primary  border-primary  shadow-sm"  :"hover:border-primary/50  hover:bg-muted/30"}`}>
  <CardContent  className="p-3  pl-4">
  <div  className="flex  items-start  justify-between  gap-2">
  <div  className="flex-1  min-w-0">
  <h3  className={`font-bold  text-sm  truncate  ${isEditing  ?"text-primary"  :"text-foreground"}`}>{item.make}  {item.model}</h3>
  <div  className="text-[11px]  text-muted-foreground  font-mono  mt-0.5">{item.yearStart}–{item.yearEnd}</div>
  </div>
  <div  className="flex  gap-1  shrink-0"  onClick={(e)  =>  e.stopPropagation()}>
  <Button  variant="ghost"  size="icon"  className="h-6  w-6  text-muted-foreground  hover:text-destructive"  onClick={()  =>  {  onDelete(item.id);  toast.success("Asignación  eliminada.");  if  (editingId  ===  item.id)  resetForm();  }}>
  <Trash2  className="w-3.5  h-3.5"  />
  </Button>
  </div>
  </div>
  <div  className="mt-2  pt-2  border-t  border-border/50">
  <div  className="flex  flex-wrap  gap-1">
  {(item.immoDetails  ??  []).map((d)  =>  {
  const  p  =  immoProfiles.find((x)  =>  x.id  ===  d.profileId);
  return  p  ?  (
  <div  key={d.profileId}  className="flex  flex-col  gap-0.5">
  <span  className="inline-flex  items-center  px-1.5  py-0.5  rounded  text-[10px]  font-medium  bg-violet-100  text-violet-800  dark:bg-violet-900/40  dark:text-violet-300  border  border-violet-200  dark:border-violet-800">
  {profileTitle(p)}
  </span>
  {d.transponder  &&  (
  <span  className="text-[9px]  text-muted-foreground  font-mono  px-1.5">{d.transponder}</span>
  )}
  </div>
  )  :  null;
  })}
  </div>
  </div>
  </CardContent>
  </Card>
  );
  })}
  </div>
  )}

  {filtered.length  >  0  &&  totalPages  >  1  &&  (
  <div  className="flex  items-center  justify-center  gap-2  pt-4">
  <Button  variant="outline"  size="sm"  disabled={safePage  ===  0}  onClick={()  =>  setPage(safePage  -  1)}>‹</Button>
  <span  className="text-sm  text-muted-foreground  font-medium  bg-muted/50  px-3  py-1  rounded-md">{safePage  +  1}  /  {totalPages}</span>
  <Button  variant="outline"  size="sm"  disabled={safePage  >=  totalPages  -  1}  onClick={()  =>  setPage(safePage  +  1)}>›</Button>
  </div>
  )}
  </div>
  </div>
  );
}
