import  {  useState,  useRef  }  from"react";
import  {  Plus,  Trash2,  Edit,  Check,  Camera,  X,  GripVertical,  Cpu,  Wrench  }  from"lucide-react";
import  {  toast  }  from"sonner";

import  {  Button  }  from"@/components/ui/button";
import  {  Input  }  from"@/components/ui/input";
import  {  Card,  CardContent  }  from"@/components/ui/card";
import  {  Badge  }  from"@/components/ui/badge";
import  {  Separator  }  from"@/components/ui/separator";

import  type  {  ImmoCatalogItem  }  from"@/types";

//  ──  helpers  ───────────────────────────────────────────────────────────────────

function  uid()  {  return  crypto.randomUUID();  }

function  fileToBase64(file:  File):  Promise<string>  {
  return  new  Promise((resolve,  reject)  =>  {
  const  reader  =  new  FileReader();
  reader.onload  =  ()  =>  resolve(reader.result  as  string);
  reader.onerror  =  reject;
  reader.readAsDataURL(file);
  });
}

//  ──  CatalogSection  ─────────────────────────────────────────────────────────────

interface  CatalogSectionProps  {
  title:  string;
  subtitle:  string;
  icon:  React.ReactNode;
  items:  ImmoCatalogItem[];
  category:  ImmoCatalogItem["category"];
  onAdd:  (item:  ImmoCatalogItem)  =>  void;
  onUpdate:  (item:  ImmoCatalogItem)  =>  void;
  onDelete:  (id:  string)  =>  void;
  onReorderAll:  (all:  ImmoCatalogItem[])  =>  void;
  allCatalog:  ImmoCatalogItem[];
}

function  CatalogSection({
  title,  subtitle,  icon,  items,  category,
  onAdd,  onUpdate,  onDelete,  onReorderAll,  allCatalog,
}:  CatalogSectionProps)  {
  const  [newLabel,  setNewLabel]  =  useState("");
  const  [editingId,  setEditingId]  =  useState<string  |  null>(null);
  const  [editingLabel,  setEditingLabel]  =  useState("");
  const  [dragId,  setDragId]  =  useState<string  |  null>(null);
  const  imgRefs  =  useRef<Map<string,  HTMLInputElement>>(new  Map());

  const  commitEdit  =  ()  =>  {
  if  (!editingId)  return;
  const  label  =  editingLabel.trim();
  if  (label)  onUpdate({  ...items.find((i)  =>  i.id  ===  editingId)!,  label  });
  setEditingId(null);
  setEditingLabel("");
  };

  const  handleImage  =  async  (id:  string,  file:  File)  =>  {
  if  (file.size  >  2  *  1024  *  1024)  {  toast.error("Imagen  máx  2  MB");  return;  }
  try  {
  const  b64  =  await  fileToBase64(file);
  const  item  =  items.find((i)  =>  i.id  ===  id);
  if  (item)  onUpdate({  ...item,  image:  b64  });
  }  catch  {  toast.error("Error  al  cargar  imagen");  }
  };

  const  handleAdd  =  ()  =>  {
  const  label  =  newLabel.trim();
  if  (!label)  return;
  onAdd({  id:  uid(),  label,  category  });
  setNewLabel("");
  };

  //  ──  DnD  ──
  const  handleDragStart  =  (id:  string)  =>  setDragId(id);

  const  handleDragOver  =  (e:  React.DragEvent,  overId:  string)  =>  {
  e.preventDefault();
  if  (!dragId  ||  dragId  ===  overId)  return;
  //  Reorder  within  this  section,  then  merge  back  with  other  category
  const  fromIdx  =  items.findIndex((i)  =>  i.id  ===  dragId);
  const  toIdx  =  items.findIndex((i)  =>  i.id  ===  overId);
  if  (fromIdx  ===  -1  ||  toIdx  ===  -1  ||  fromIdx  ===  toIdx)  return;
  const  reordered  =  [...items];
  reordered.splice(toIdx,  0,  reordered.splice(fromIdx,  1)[0]);
  const  others  =  allCatalog.filter((i)  =>  i.category  !==  category);
  //  Preserve  other-category  items  in  their  original  positions
  onReorderAll([...others,  ...reordered]);
  };

  const  handleDragEnd  =  ()  =>  setDragId(null);

  return  (
  <Card  className="flex  flex-col">
  <CardContent  className="p-5  flex  flex-col  gap-4  h-full">
  {/*  Header  */}
  <div  className="flex  items-start  gap-3">
  <div  className="p-2  rounded-lg  bg-primary/10  text-primary  shrink-0  mt-0.5">{icon}</div>
  <div>
  <h3  className="font-bold  text-base  text-foreground">{title}</h3>
  <p  className="text-xs  text-muted-foreground  mt-0.5">{subtitle}</p>
  </div>
  <Badge  variant="secondary"  className="ml-auto  shrink-0">{items.length}</Badge>
  </div>

  <Separator  />

  {/*  Item  list  */}
  <div  className="flex-1  space-y-1.5  min-h-[80px]">
  {items.length  ===  0  &&  (
  <div  className="flex  items-center  justify-center  py-8  rounded-lg  border  border-dashed  border-border  text-muted-foreground  text-sm">
  Sin  elementos.  Agrega  el  primero  abajo.
  </div>
  )}
  {items.map((item)  =>  (
  <div
  key={item.id}
  draggable
  onDragStart={()  =>  handleDragStart(item.id)}
  onDragOver={(e)  =>  handleDragOver(e,  item.id)}
  onDragEnd={handleDragEnd}
  style={{  opacity:  dragId  ===  item.id  ?  0.4  :  1  }}
  className="flex  items-center  gap-2  p-2  rounded-lg  border  border-border  bg-card  hover:border-primary/30  transition-colors  group"
  >
  {/*  Drag  handle  */}
  <GripVertical  className="w-4  h-4  text-muted-foreground/40  shrink-0  cursor-grab  active:cursor-grabbing"  />

  {/*  Image  */}
  <input
  type="file"
  accept="image/*"
  className="hidden"
  ref={(el)  =>  {  if  (el)  imgRefs.current.set(item.id,  el);  else  imgRefs.current.delete(item.id);  }}
  onChange={(e)  =>  {  const  f  =  e.target.files?.[0];  if  (f)  handleImage(item.id,  f);  e.target.value  ="";  }}
  />
  <button
  type="button"
  title={item.image  ?"Cambiar  imagen"  :"Subir  imagen"}
  onClick={()  =>  imgRefs.current.get(item.id)?.click()}
  className="w-8  h-8  rounded-md  border  border-border  overflow-hidden  shrink-0  flex  items-center  justify-center  hover:border-primary/50  transition-colors"
  >
  {item.image
  ?  <img  src={item.image}  alt=""  className="w-full  h-full  object-cover"  />
  :  <Camera  className="w-3.5  h-3.5  text-muted-foreground"  />
  }
  </button>

  {/*  Label  (editable  inline)  */}
  {editingId  ===  item.id  ?  (
  <input
  autoFocus
  value={editingLabel}
  onChange={(e)  =>  setEditingLabel(e.target.value)}
  onBlur={commitEdit}
  onKeyDown={(e)  =>  {  if  (e.key  ==="Enter")  commitEdit();  if  (e.key  ==="Escape")  setEditingId(null);  }}
  className="flex-1  px-2  py-1  rounded-md  border  border-primary  text-sm  font-semibold  bg-background  focus:outline-none  focus:ring-1  focus:ring-primary  min-w-0"
  />
  )  :  (
  <span  className="flex-1  text-sm  font-semibold  text-foreground  truncate  min-w-0">{item.label}</span>
  )}

  {/*  Actions  */}
  <div  className="flex  items-center  gap-0.5  shrink-0">
  {item.image  &&  (
  <button
  type="button"
  title="Quitar  imagen"
  onClick={()  =>  onUpdate({  ...item,  image:  undefined  })}
  className="w-6  h-6  flex  items-center  justify-center  rounded  text-muted-foreground  hover:text-amber-500  hover:bg-amber-500/10  transition-colors"
  >
  <X  className="w-3  h-3"  />
  </button>
  )}
  <button
  type="button"
  title="Editar  nombre"
  onClick={()  =>  {
  if  (editingId  ===  item.id)  {  commitEdit();  return;  }
  setEditingId(item.id);
  setEditingLabel(item.label);
  }}
  className={`w-6  h-6  flex  items-center  justify-center  rounded  transition-colors  ${
  editingId  ===  item.id
  ?"bg-primary/20  text-primary"
  :"text-muted-foreground  hover:text-primary  hover:bg-primary/10"
  }`}
  >
  {editingId  ===  item.id  ?  <Check  className="w-3  h-3"  />  :  <Edit  className="w-3  h-3"  />}
  </button>
  <button
  type="button"
  title="Eliminar"
  onClick={()  =>  {  onDelete(item.id);  toast.success("Elemento  eliminado.");  }}
  className="w-6  h-6  flex  items-center  justify-center  rounded  text-muted-foreground  hover:text-destructive  hover:bg-destructive/10  transition-colors"
  >
  <Trash2  className="w-3  h-3"  />
  </button>
  </div>
  </div>
  ))}
  </div>

  {/*  Add  new  */}
  <div  className="flex  gap-2  pt-1  border-t  border-border">
  <Input
  value={newLabel}
  onChange={(e)  =>  setNewLabel(e.target.value)}
  onKeyDown={(e)  =>  e.key  ==="Enter"  &&  handleAdd()}
  placeholder={`Nuevo  ${category  ==="equipo"  ?"equipo"  :"transponder"}…`}
  className="h-8  text-sm  flex-1"
  />
  <Button
  type="button"
  variant="secondary"
  size="sm"
  className="h-8  shrink-0"
  onClick={handleAdd}
  disabled={!newLabel.trim()}
  >
  <Plus  className="w-3.5  h-3.5  mr-1"  />  Agregar
  </Button>
  </div>
  </CardContent>
  </Card>
  );
}

//  ──  ImmoSuppliesManager  ────────────────────────────────────────────────────────

interface  ImmoSuppliesManagerProps  {
  catalog:  ImmoCatalogItem[];
  onAdd:  (item:  ImmoCatalogItem)  =>  void;
  onUpdate:  (item:  ImmoCatalogItem)  =>  void;
  onDelete:  (id:  string)  =>  void;
  onReorderAll:  (items:  ImmoCatalogItem[])  =>  void;
}

export  function  ImmoSuppliesManager({
  catalog,  onAdd,  onUpdate,  onDelete,  onReorderAll,
}:  ImmoSuppliesManagerProps)  {
  const  transponders  =  catalog.filter((i)  =>  i.category  ==="transponder");
  const  equipos  =  catalog.filter((i)  =>  i.category  ==="equipo");

  return  (
  <div  className="space-y-4">
  <div>
  <h2  className="text-lg  font-bold  text-foreground">Herramientas  y  Suministros</h2>
  <p  className="text-sm  text-muted-foreground  mt-0.5">
  Catálogo  centralizado.  Los  perfiles  Immo  consumen  estos  elementos  al  asignar  equipos  y  tipos  de  transponder.
  </p>
  </div>

  <div  className="grid  grid-cols-1  lg:grid-cols-2  gap-5">
  <CatalogSection
  title="Tipos  de  Transponder"
  subtitle='Opciones  disponibles  en"Se  genera  con"'
  icon={<Cpu  className="w-4  h-4"  />}
  items={transponders}
  category="transponder"
  onAdd={onAdd}
  onUpdate={onUpdate}
  onDelete={onDelete}
  onReorderAll={onReorderAll}
  allCatalog={catalog}
  />

  <CatalogSection
  title="Equipos  de  Programación"
  subtitle='Opciones  para  equipos  del  remoto  y  transponder'
  icon={<Wrench  className="w-4  h-4"  />}
  items={equipos}
  category="equipo"
  onAdd={onAdd}
  onUpdate={onUpdate}
  onDelete={onDelete}
  onReorderAll={onReorderAll}
  allCatalog={catalog}
  />
  </div>
  </div>
  );
}
