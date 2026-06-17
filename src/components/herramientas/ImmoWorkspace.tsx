import  {  ArrowLeft,  Cpu,  Radio,  Wrench,  ShieldCheck,  Check  }  from"lucide-react";
import  type  {  ImmoProfile,  ImmoAssignmentDetail,  ImmoCatalogItem  }  from"@/types";

function  profileTitle(p:  ImmoProfile)  {
  const  parts  =  [p.marca,  p.fccId].filter(Boolean);
  return  parts.length  ?  parts.join("")  :"Immo  Info";
}

function  SectionLabel({  icon,  text  }:  {  icon:  React.ReactNode;  text:  string  })  {
  return  (
  <div  className="flex  items-center  gap-1.5  mb-2">
  <div  className="text-primary/60">{icon}</div>
  <span  className="text-[9px]  font-bold  uppercase  tracking-widest  text-muted-foreground">{text}</span>
  <div  className="flex-1  h-px  bg-border/60"  />
  </div>
  );
}

function  SelectedChips({  ids,  catalog,  narrow  =  false  }:  {  ids:  string[];  catalog:  ImmoCatalogItem[];  narrow?:  boolean  })  {
  const  items  =  ids.map((id)  =>  catalog.find((c)  =>  c.id  ===  id)).filter(Boolean)  as  ImmoCatalogItem[];
  if  (items.length  ===  0)  return  <span  className="text-xs  text-muted-foreground  italic">—</span>;

  if  (narrow)  {
  return  (
  <div  className="grid  grid-cols-2  gap-1.5">
  {items.map((item)  =>  (
  <div  key={item.id}  className="flex  flex-col  items-center  gap-0.5">
  <div  className="aspect-square  w-full  rounded-lg  overflow-hidden  border  border-primary/15  bg-primary/5  flex  items-center  justify-center">
  {item.image  ?  (
  <img  src={item.image}  alt={item.label}  className="w-full  h-full  object-cover"  />
  )  :  (
  <Check  className="w-3  h-3  text-primary/40"  />
  )}
  </div>
  <p  className="text-[9px]  font-medium  text-foreground  text-center  leading-tight  w-full  truncate">{item.label}</p>
  </div>
  ))}
  </div>
  );
  }

  return  (
  <div  className="grid  grid-cols-3  sm:grid-cols-4  gap-2.5">
  {items.map((item)  =>  (
  <div  key={item.id}  className="flex  flex-col  items-center  gap-1">
  <div  className="aspect-square  w-full  rounded-xl  overflow-hidden  border  border-primary/20  bg-primary/5  flex  items-center  justify-center">
  {item.image  ?  (
  <img  src={item.image}  alt={item.label}  className="w-full  h-full  object-cover"  />
  )  :  (
  <Check  className="w-4  h-4  text-primary/50"  />
  )}
  </div>
  <p  className="text-[10px]  font-semibold  text-foreground  text-center  leading-tight  w-full  truncate">{item.label}</p>
  </div>
  ))}
  </div>
  );
}

function  CompactRow({  label,  value  }:  {  label:  string;  value?:  string  })  {
  return  (
  <div  className="space-y-0.5">
  <p  className="text-[9px]  font-bold  uppercase  tracking-wide  text-muted-foreground/70  leading-none">{label}</p>
  <p  className="text-xs  text-foreground  font-mono  break-all  leading-snug">
  {value  ?  value  :  <span  className="text-muted-foreground/50  italic">—</span>}
  </p>
  </div>
  );
}

//  ──  ImmoWorkspace  ─────────────────────────────────────────────────────────────

interface  ImmoWorkspaceProps  {
  profile:  ImmoProfile;
  detail:  ImmoAssignmentDetail  |  null;
  catalog:  ImmoCatalogItem[];
  vehicle?:  {  year:  number;  make:  string;  model:  string  };
  onBack:  ()  =>  void;
}

export  function  ImmoWorkspace({  profile,  detail,  catalog,  vehicle,  onBack  }:  ImmoWorkspaceProps)  {
  const  title  =  profileTitle(profile);
  const  generacionRemoto  =  profile.generacionRemoto  ??  [];
  const  hasGenFields  =  generacionRemoto.some((f)  =>  f.value.trim());

  const  generadoConIds  =  detail?.generadoConIds  ??  [];
  const  equiposRemotoIds  =  detail?.equiposRemotoIds  ??  [];
  const  equiposTransponderIds  =  detail?.equiposTransponderIds  ??  [];
  const  hasGeneradoCon  =  generadoConIds.length  >  0;
  const  hasEquiposRemoto  =  equiposRemotoIds.length  >  0;
  const  hasEquiposTransponder  =  equiposTransponderIds.length  >  0;
  const  hasTransponder  =  !!(detail?.transponder?.trim());
  const  hasProgramacion  =  hasEquiposRemoto  ||  hasEquiposTransponder  ||
  detail?.programacionManual  ||  detail?.programacionOBD  ||
  !!(detail?.procedimientoProgramacion?.trim());
  const  bothCols  =  hasGenFields  &&  (hasTransponder  ||  hasGeneradoCon);

  return  (
  <div  className="flex  flex-col  min-h-0  max-w-2xl  md:max-w-4xl  mx-auto  w-full">
  {/*  Sticky  header  */}
  <div  className="sticky  top-0  z-10  flex  items-center  gap-3  px-4  py-3  bg-background/95  backdrop-blur-sm  border-b  border-border  shrink-0">
  <button  onClick={onBack}  className="flex  items-center  justify-center  w-9  h-9  rounded-full  bg-muted  hover:bg-muted/80  transition-colors  shrink-0">
  <ArrowLeft  className="w-4  h-4"  />
  </button>
  <div  className="min-w-0  flex-1">
  <p  className="text-xs  text-muted-foreground  leading-none  mb-0.5">Immo  Info</p>
  <h2  className="text-sm  font-bold  text-foreground  truncate  leading-tight">
  {vehicle  ?  `${vehicle.year}  ${vehicle.make}  ${vehicle.model}`  :  title}
  </h2>
  </div>
  <div  className="flex  items-center  justify-center  w-9  h-9  rounded-full  bg-primary/10  shrink-0">
  <Cpu  className="w-4  h-4  text-primary"  />
  </div>
  </div>

  {/*  Body  —  stacked  on  mobile,  side-by-side  on  desktop  */}
  <div  className="flex-1  min-h-0  flex  flex-col  md:flex-row  overflow-hidden">

  {/*  Image  —  top  on  mobile,  left  column  on  desktop  */}
  {profile.mainImage  &&  (
  <div  className="bg-muted/30  shrink-0  md:w-72  lg:w-80  md:border-r  md:border-border  md:overflow-y-auto  md:flex  md:items-start  md:justify-center">
  <img  src={profile.mainImage}  alt={title}  className="w-full  object-contain  max-h-52  md:max-h-none  md:w-full"  />
  </div>
  )}

  {/*  Content  —  scrollable  */}
  <div  className="flex-1  overflow-y-auto  min-h-0">
  <div  className="px-3  py-3  space-y-4">

  {/*  Detalles  del  Remoto  —  compact  card  */}
  <section>
  <SectionLabel  icon={<Radio  className="w-3  h-3"  />}  text="Detalles  del  Remoto"  />
  <div  className="rounded-xl  border  border-border  overflow-hidden">
  {/*  FCC  ID  —  full  width  so  long  values  never  overflow  */}
  {profile.fccId  &&  (
  <div  className="px-3  py-2  border-b  border-border/50">
  <p  className="text-[9px]  font-bold  uppercase  tracking-wide  text-muted-foreground/70  leading-none  mb-0.5">FCC  ID</p>
  <p  className="text-sm  text-foreground  font-mono  break-all  font-semibold  leading-snug">{profile.fccId}</p>
  </div>
  )}
  {/*  Marca  /  Frecuencia  /  Batería  —  3-column  row  */}
  <div  className="grid  grid-cols-3  divide-x  divide-border/50">
  <div  className="px-3  py-2">
  <CompactRow  label="Marca"  value={profile.marca}  />
  </div>
  <div  className="px-3  py-2">
  <CompactRow  label="Frec."  value={profile.frecuencia}  />
  </div>
  <div  className="px-3  py-2">
  <CompactRow  label="Bat."  value={profile.bateria}  />
  </div>
  </div>
  </div>
  </section>

  {/*  Generación  de  Remoto  +  Transponder  —  unified  card  */}
  {(hasGenFields  ||  hasTransponder  ||  hasGeneradoCon)  &&  (
  <div  className="rounded-xl  border  border-border  overflow-hidden">
  {/*  Top  2-col  row:  Generación  |  Transponder  */}
  {(hasGenFields  ||  hasTransponder)  &&  (
  <div  className={`grid  items-start  ${bothCols  &&  hasTransponder  ?"grid-cols-2  divide-x  divide-border"  :"grid-cols-1"}`}>
  {hasGenFields  &&  (
  <div  className="p-2.5  space-y-2.5">
  <div  className="flex  items-center  gap-1.5  min-w-0">
  <Wrench  className="w-3  h-3  text-primary/60  shrink-0"  />
  <span  className="text-[9px]  font-bold  uppercase  tracking-wide  text-muted-foreground  leading-none  truncate">Generación  de  Remoto</span>
  </div>
  <div  className="space-y-2">
  {generacionRemoto.filter((f)  =>  f.value.trim()).map((f)  =>  (
  <CompactRow  key={f.id}  label={f.label}  value={f.value}  />
  ))}
  </div>
  </div>
  )}
  {hasTransponder  &&  (
  <div  className="p-2.5  space-y-2.5">
  <div  className="flex  items-center  gap-1.5  min-w-0">
  <Cpu  className="w-3  h-3  text-primary/60  shrink-0"  />
  <span  className="text-[9px]  font-bold  uppercase  tracking-wide  text-muted-foreground  leading-none  truncate">Transponder</span>
  </div>
  <CompactRow  label="Tipo"  value={detail!.transponder}  />
  </div>
  )}
  </div>
  )}

  {/*  Full-width"Se  genera  con"  row  —  chips  span  the  full  card  width  */}
  {hasGeneradoCon  &&  (
  <div  className={`px-2.5  pb-2.5  space-y-1.5  ${(hasGenFields  ||  hasTransponder)  ?"border-t  border-border  pt-2.5"  :"pt-2.5"}`}>
  <p  className="text-[9px]  font-bold  uppercase  tracking-wide  text-muted-foreground/70  leading-none">Se  genera  con</p>
  <SelectedChips  ids={generadoConIds}  catalog={catalog}  />
  </div>
  )}
  </div>
  )}

  {/*  Detalles  de  Programación  */}
  {hasProgramacion  &&  (
  <section>
  <SectionLabel  icon={<ShieldCheck  className="w-3  h-3"  />}  text="Detalles  de  Programación"  />
  <div  className="space-y-3">
  {hasEquiposRemoto  &&  (
  <div  className="space-y-1.5">
  <p  className="text-[9px]  font-bold  uppercase  tracking-wide  text-muted-foreground/70  leading-none">Equipos  —  Remoto</p>
  <SelectedChips  ids={equiposRemotoIds}  catalog={catalog}  />
  </div>
  )}
  {hasEquiposTransponder  &&  (
  <div  className="space-y-1.5">
  <p  className="text-[9px]  font-bold  uppercase  tracking-wide  text-muted-foreground/70  leading-none">Equipos  —  Transponder</p>
  <SelectedChips  ids={equiposTransponderIds}  catalog={catalog}  />
  </div>
  )}
  {(detail?.programacionManual  ||  detail?.programacionOBD)  &&  (
  <div  className="flex  flex-wrap  gap-2">
  {detail?.programacionManual  &&  (
  <span  className="inline-flex  items-center  gap-1.5  px-3  py-1.5  rounded-full  bg-emerald-100  text-emerald-800  dark:bg-emerald-900/30  dark:text-emerald-300  border  border-emerald-200  dark:border-emerald-800  text-xs  font-semibold">
  <Check  className="w-3  h-3"  />  Programación  Manual
  </span>
  )}
  {detail?.programacionOBD  &&  (
  <span  className="inline-flex  items-center  gap-1.5  px-3  py-1.5  rounded-full  bg-primary/10  text-primary  dark:text-primary  border  border-primary/20  text-xs  font-semibold">
  <Check  className="w-3  h-3"  />  Programación  OBD
  </span>
  )}
  </div>
  )}
  {detail?.procedimientoProgramacion?.trim()  &&  (
  <div  className="space-y-1.5">
  <p  className="text-[9px]  font-bold  uppercase  tracking-wide  text-muted-foreground/70  leading-none">Procedimiento</p>
  <div  className="rounded-xl  bg-muted/30  border  border-border  p-3">
  <p  className="text-sm  text-foreground  leading-relaxed  whitespace-pre-wrap">
  {detail.procedimientoProgramacion}
  </p>
  </div>
  </div>
  )}
  </div>
  </section>
  )}

  <div  className="h-4"  />
  </div>
  </div>
  </div>
  </div>
  );
}
