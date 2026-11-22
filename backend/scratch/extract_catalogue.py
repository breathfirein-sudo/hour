import zipfile, xml.etree.ElementTree as ET, json, os

ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
xlsx_path = r'c:\Users\shiva\OneDrive\Desktop\india_phone_brands_model_catalogue_research.xlsx'

with zipfile.ZipFile(xlsx_path) as z:
    wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
    sheets = {s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']: s.attrib['name'] for s in wb_tree.findall('.//m:sheet', ns)}
    
    rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    sheet_files = {}
    for r in rels_tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
        r_id = r.attrib['Id']
        target = r.attrib['Target'].lstrip('/')
        if not target.startswith('xl/'):
            target = 'xl/' + target
        if r_id in sheets:
            sheet_files[sheets[r_id]] = target

    tree2 = ET.fromstring(z.read(sheet_files['Master Model Register']))
    rows = tree2.findall('.//m:row', ns)
    
    brand_models_map = {}
    
    for r in rows[1:]:
        row_vals = []
        for c in r.findall('m:c', ns):
            is_el = c.find('m:is', ns)
            v = c.find('m:v', ns)
            val = is_el.find('.//m:t', ns).text if is_el is not None and is_el.find('.//m:t', ns) is not None else (v.text if v is not None else '')
            row_vals.append(val.strip() if val else '')
            
        if len(row_vals) > 2:
            brand = row_vals[1]
            model = row_vals[2]
            year = row_vals[3] if len(row_vals) > 3 else ''
            variant = row_vals[4] if len(row_vals) > 4 else ''
            
            if not brand or not model:
                continue
                
            if brand not in brand_models_map:
                brand_models_map[brand] = []
                
            if not any(m['name'].lower() == model.lower() for m in brand_models_map[brand]):
                brand_models_map[brand].append({
                    'name': model,
                    'year': year if year and year != 'Not confirmed here' else '',
                    'variant': variant
                })
                
    catalog_list = []
    total_models = 0
    for brand, models in sorted(brand_models_map.items()):
        total_models += len(models)
        catalog_list.append({
            'brand': brand,
            'modelCount': len(models),
            'models': sorted(models, key=lambda x: x['name'])
        })
        
    out_dir = r'backend/data'
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'phone_catalogue_master.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(catalog_list, f, indent=2, ensure_ascii=False)
        
    # Also write to frontend public/data so it can be loaded directly or via API
    fe_dir = r'frontend/src/data'
    os.makedirs(fe_dir, exist_ok=True)
    fe_path = os.path.join(fe_dir, 'phone_catalogue_master.json')
    with open(fe_path, 'w', encoding='utf-8') as f:
        json.dump(catalog_list, f, indent=2, ensure_ascii=False)
        
    print(f'Done! Wrote {len(catalog_list)} brands and {total_models} models to {out_path} and {fe_path}')

