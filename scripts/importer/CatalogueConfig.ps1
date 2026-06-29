$script:CatalogueCategories = [ordered]@{
  'engine-parts' = @{
    Title = 'Engine Parts'
    Icon = '⬡'
    Intro = 'Heavy-duty engine components for reliable power, efficiency and long-haul durability.'
  }
  'clutch-system' = @{
    Title = 'Clutch System'
    Icon = '◉'
    Intro = 'Engagement, release and actuation parts engineered for heavy commercial drivetrains.'
  }
  'brake-system' = @{
    Title = 'Brake System'
    Icon = '◫'
    Intro = 'Pneumatic and friction components for confident heavy-truck and trailer braking.'
  }
  'suspension-system' = @{
    Title = 'Suspension System'
    Icon = '⌁'
    Intro = 'Load-control and ride components for prime movers, container haulers and trailers.'
  }
  'cooling-system' = @{
    Title = 'Cooling System'
    Icon = '✣'
    Intro = 'Cooling and temperature-control parts that help heavy engines perform under load.'
  }
  'electrical-system' = @{
    Title = 'Electrical System'
    Icon = 'ϟ'
    Intro = 'Starting, charging, sensing and control components for modern heavy commercial vehicles.'
  }
  'steering-system' = @{
    Title = 'Steering System'
    Icon = '◎'
    Intro = 'Hydraulic and mechanical steering components for accurate, dependable road control.'
  }
  'transmission-parts' = @{
    Title = 'Transmission Parts'
    Icon = '↹'
    Intro = 'Gearbox internals and shifting components designed for high-torque commercial duty.'
  }
  'axle-parts' = @{
    Title = 'Axle Parts'
    Icon = '↔'
    Intro = 'Differential, shaft and wheel-end components for heavy load-bearing drivetrains.'
  }
  'trailer-parts' = @{
    Title = 'Trailer Parts'
    Icon = '▰'
    Intro = 'Running gear, braking and coupling components for trailers and container haulage.'
  }
}

$script:FallbackProducts = @{
  'engine-parts' = @(
    @{ Number = 'NAE-ENG-001'; Name = 'Piston & Liner Kit'; Description = 'Engine internal'; Application = 'HOWO / SHACMAN'; Availability = 'Ready stock' },
    @{ Number = 'NAE-ENG-002'; Name = 'Cylinder Head Assembly'; Description = 'Top end'; Application = 'Heavy-duty diesel'; Availability = 'Ready stock' },
    @{ Number = 'NAE-ENG-003'; Name = 'Full Gasket Set'; Description = 'Sealing'; Application = 'Multiple applications'; Availability = 'On request' },
    @{ Number = 'NAE-ENG-004'; Name = 'Engine Oil Pump'; Description = 'Lubrication'; Application = 'High-flow replacement'; Availability = 'Ready stock' },
    @{ Number = 'NAE-ENG-005'; Name = 'Turbocharger Assembly'; Description = 'Air induction'; Application = 'Commercial duty'; Availability = 'Ready stock' },
    @{ Number = 'NAE-ENG-006'; Name = 'Connecting Rod Bearing'; Description = 'Engine internal'; Application = 'Standard size'; Availability = 'On request' }
  )
  'clutch-system' = @(
    @{ Number = 'NAE-CLU-001'; Name = 'Clutch Disc Assembly'; Description = '430 mm class'; Application = 'Prime mover'; Availability = 'Ready stock' },
    @{ Number = 'NAE-CLU-002'; Name = 'Clutch Pressure Plate'; Description = 'High clamp load'; Application = 'Heavy-duty'; Availability = 'Ready stock' },
    @{ Number = 'NAE-CLU-003'; Name = 'Release Bearing'; Description = 'Clutch release'; Application = 'Multiple applications'; Availability = 'On request' },
    @{ Number = 'NAE-CLU-004'; Name = 'Clutch Booster'; Description = 'Air-assisted'; Application = 'Cab-over truck'; Availability = 'Ready stock' },
    @{ Number = 'NAE-CLU-005'; Name = 'Clutch Master Cylinder'; Description = 'Hydraulic'; Application = 'Replacement'; Availability = 'Ready stock' },
    @{ Number = 'NAE-CLU-006'; Name = 'Clutch Fork Assembly'; Description = 'Actuation'; Application = 'Commercial duty'; Availability = 'On request' }
  )
  'brake-system' = @(
    @{ Number = 'NAE-BRA-001'; Name = 'Brake Lining Set'; Description = 'Friction'; Application = 'Truck axle'; Availability = 'Ready stock' },
    @{ Number = 'NAE-BRA-002'; Name = 'Spring Brake Chamber'; Description = 'Air brake'; Application = 'Truck / trailer'; Availability = 'Ready stock' },
    @{ Number = 'NAE-BRA-003'; Name = 'Four-Circuit Valve'; Description = 'Air management'; Application = 'Heavy-duty'; Availability = 'On request' },
    @{ Number = 'NAE-BRA-004'; Name = 'Air Dryer Assembly'; Description = 'Air treatment'; Application = 'Prime mover'; Availability = 'Ready stock' },
    @{ Number = 'NAE-BRA-005'; Name = 'Relay Valve'; Description = 'Air brake'; Application = 'Trailer compatible'; Availability = 'Ready stock' },
    @{ Number = 'NAE-BRA-006'; Name = 'Brake Drum'; Description = 'Wheel end'; Application = 'Commercial duty'; Availability = 'On request' }
  )
  'suspension-system' = @(
    @{ Number = 'NAE-SUS-001'; Name = 'Front Leaf Spring'; Description = 'Steel suspension'; Application = 'Heavy axle'; Availability = 'Ready stock' },
    @{ Number = 'NAE-SUS-002'; Name = 'Torque Rod Assembly'; Description = 'Axle location'; Application = 'Prime mover'; Availability = 'Ready stock' },
    @{ Number = 'NAE-SUS-003'; Name = 'Cab Shock Absorber'; Description = 'Cab suspension'; Application = 'Front / rear'; Availability = 'On request' },
    @{ Number = 'NAE-SUS-004'; Name = 'Air Spring Bellows'; Description = 'Air suspension'; Application = 'Truck / trailer'; Availability = 'Ready stock' },
    @{ Number = 'NAE-SUS-005'; Name = 'Stabiliser Bar Link'; Description = 'Chassis control'; Application = 'Heavy-duty'; Availability = 'Ready stock' },
    @{ Number = 'NAE-SUS-006'; Name = 'Spring Shackle Kit'; Description = 'Suspension mount'; Application = 'Replacement'; Availability = 'On request' }
  )
  'cooling-system' = @(
    @{ Number = 'NAE-COO-001'; Name = 'Engine Water Pump'; Description = 'Coolant circulation'; Application = 'Heavy diesel'; Availability = 'Ready stock' },
    @{ Number = 'NAE-COO-002'; Name = 'Radiator Assembly'; Description = 'Heat exchange'; Application = 'Prime mover'; Availability = 'Ready stock' },
    @{ Number = 'NAE-COO-003'; Name = 'Fan Clutch'; Description = 'Thermal control'; Application = 'Heavy-duty'; Availability = 'On request' },
    @{ Number = 'NAE-COO-004'; Name = 'Thermostat Kit'; Description = 'Temperature control'; Application = 'Multiple ratings'; Availability = 'Ready stock' },
    @{ Number = 'NAE-COO-005'; Name = 'Expansion Tank'; Description = 'Coolant reserve'; Application = 'Cab-over truck'; Availability = 'Ready stock' },
    @{ Number = 'NAE-COO-006'; Name = 'Radiator Hose Set'; Description = 'Coolant transfer'; Application = 'Model specific'; Availability = 'On request' }
  )
  'electrical-system' = @(
    @{ Number = 'NAE-ELE-001'; Name = 'Starter Motor'; Description = '24V system'; Application = 'Heavy diesel'; Availability = 'Ready stock' },
    @{ Number = 'NAE-ELE-002'; Name = 'Alternator Assembly'; Description = 'Charging'; Application = '24V commercial'; Availability = 'Ready stock' },
    @{ Number = 'NAE-ELE-003'; Name = 'Crankshaft Sensor'; Description = 'Engine sensing'; Application = 'Electronic diesel'; Availability = 'On request' },
    @{ Number = 'NAE-ELE-004'; Name = 'Combination Switch'; Description = 'Cab controls'; Application = 'Model specific'; Availability = 'Ready stock' },
    @{ Number = 'NAE-ELE-005'; Name = 'Headlamp Assembly'; Description = 'Lighting'; Application = 'Left / right'; Availability = 'Ready stock' },
    @{ Number = 'NAE-ELE-006'; Name = 'Relay & Fuse Module'; Description = 'Electrical control'; Application = 'Heavy truck'; Availability = 'On request' }
  )
  'steering-system' = @(
    @{ Number = 'NAE-STE-001'; Name = 'Power Steering Pump'; Description = 'Hydraulic assist'; Application = 'Heavy-duty'; Availability = 'Ready stock' },
    @{ Number = 'NAE-STE-002'; Name = 'Drag Link Assembly'; Description = 'Steering linkage'; Application = 'Model specific'; Availability = 'Ready stock' },
    @{ Number = 'NAE-STE-003'; Name = 'Tie Rod End'; Description = 'Front axle'; Application = 'Left / right'; Availability = 'On request' },
    @{ Number = 'NAE-STE-004'; Name = 'Steering Gear Repair Kit'; Description = 'Hydraulic steering'; Application = 'Seal set'; Availability = 'Ready stock' },
    @{ Number = 'NAE-STE-005'; Name = 'Steering Column Joint'; Description = 'Cab linkage'; Application = 'Replacement'; Availability = 'Ready stock' },
    @{ Number = 'NAE-STE-006'; Name = 'Kingpin Repair Kit'; Description = 'Steer axle'; Application = 'Commercial duty'; Availability = 'On request' }
  )
  'transmission-parts' = @(
    @{ Number = 'NAE-TRA-001'; Name = 'Synchroniser Assembly'; Description = 'Gear engagement'; Application = 'Manual transmission'; Availability = 'Ready stock' },
    @{ Number = 'NAE-TRA-002'; Name = 'Main Shaft Gear'; Description = 'Gear train'; Application = 'Heavy-duty'; Availability = 'Ready stock' },
    @{ Number = 'NAE-TRA-003'; Name = 'Countershaft Bearing'; Description = 'Transmission internal'; Application = 'Precision fit'; Availability = 'On request' },
    @{ Number = 'NAE-TRA-004'; Name = 'Gear Selector Fork'; Description = 'Shift system'; Application = 'Model specific'; Availability = 'Ready stock' },
    @{ Number = 'NAE-TRA-005'; Name = 'Input Shaft'; Description = 'Power transfer'; Application = 'Prime mover'; Availability = 'Ready stock' },
    @{ Number = 'NAE-TRA-006'; Name = 'Transmission Seal Kit'; Description = 'Sealing'; Application = 'Complete set'; Availability = 'On request' }
  )
  'axle-parts' = @(
    @{ Number = 'NAE-AXL-001'; Name = 'Wheel Hub Assembly'; Description = 'Wheel end'; Application = 'Front / rear'; Availability = 'Ready stock' },
    @{ Number = 'NAE-AXL-002'; Name = 'Differential Gear Set'; Description = 'Final drive'; Application = 'Heavy axle'; Availability = 'Ready stock' },
    @{ Number = 'NAE-AXL-003'; Name = 'Rear Axle Shaft'; Description = 'Power transfer'; Application = 'Model specific'; Availability = 'On request' },
    @{ Number = 'NAE-AXL-004'; Name = 'Hub Bearing Kit'; Description = 'Wheel end'; Application = 'Commercial duty'; Availability = 'Ready stock' },
    @{ Number = 'NAE-AXL-005'; Name = 'Oil Seal Kit'; Description = 'Axle sealing'; Application = 'Multiple sizes'; Availability = 'Ready stock' },
    @{ Number = 'NAE-AXL-006'; Name = 'Crown Wheel & Pinion'; Description = 'Final drive'; Application = 'Matched set'; Availability = 'On request' }
  )
  'trailer-parts' = @(
    @{ Number = 'NAE-TRE-001'; Name = 'Landing Gear Set'; Description = 'Trailer support'; Application = 'Two-speed'; Availability = 'Ready stock' },
    @{ Number = 'NAE-TRE-002'; Name = 'Kingpin Assembly'; Description = 'Fifth-wheel coupling'; Application = 'Container trailer'; Availability = 'Ready stock' },
    @{ Number = 'NAE-TRE-003'; Name = 'Slack Adjuster'; Description = 'Brake actuation'; Application = 'Manual / automatic'; Availability = 'On request' },
    @{ Number = 'NAE-TRE-004'; Name = 'Trailer Air Spring'; Description = 'Suspension'; Application = 'Heavy load'; Availability = 'Ready stock' },
    @{ Number = 'NAE-TRE-005'; Name = 'Twist Lock Assembly'; Description = 'Container securement'; Application = 'Heavy-duty'; Availability = 'Ready stock' },
    @{ Number = 'NAE-TRE-006'; Name = 'Trailer Axle Bearing'; Description = 'Wheel end'; Application = 'Commercial trailer'; Availability = 'On request' }
  )
}

function Get-CatalogueCategories {
  return $script:CatalogueCategories
}

function Get-FallbackProducts {
  return $script:FallbackProducts
}
