import {
  NamingDictionary,
  WarehouseNode,
  InventoryTransaction,
  InventoryStock,
} from '@/types/warehouse';

export const DEFAULT_NAMING_DICTIONARY: NamingDictionary = {
  companyCodes: {
    SB: 'Công ty Cổ phần Năng lượng Sông Ba (SB)',
    DRS: 'Tập đoàn Năng lượng Tái tạo DakRoSa (DRS)',
  },
  factoryCodes: {
    HPP: 'Nhà máy Thủy điện Sông Ba (HPP - 120MW)',
    WPP: 'Nhà máy Điện gió Hướng Linh (WPP - 100MW)',
    SPP: 'Nhà máy Điện mặt trời Chư Ngọc (SPP - 50MWp)',
    HUB: 'Tổng kho Chiến lược Công ty Mẹ (Central Hub)',
  },
  mainParts: {
    T: 'Tuabin Thủy lực (T)',
    WTG: 'Tuabin Gió (WTG)',
    INV: 'Biến tần & Trạm Inverter Solar (INV)',
    TRF: 'Trạm Biến áp 110kV (TRF)',
    G: 'Máy phát điện (G)',
    GV: 'Hệ thống Điều tốc (GV)',
    E: 'Hệ thống Kích từ (E)',
    PCH: 'Hệ thống Pitch (PCH)',
    YAW: 'Hệ thống Yaw (YAW)',
    PV: 'Chuỗi Tấm pin & Khung Tracker (PV)',
    W: 'Hệ thống Nước kỹ thuật (W)',
    P: 'Hệ thống Rơ-le Bảo vệ (P)',
    C: 'Hệ thống Điều khiển SCADA (C)',
  },
  subParts: {
    S: 'Buồng xoắn (S)',
    Gu: 'Cánh hướng nước (Gu)',
    Sh: 'Trục chính (Sh)',
    Be: 'Ổ đỡ / Vòng bi (Be)',
    Ro: 'Roăng / Phớt làm kín (Ro)',
    Gbx: 'Hộp số Tuabin gió (Gbx)',
    Bld: 'Cánh quạt gió / Keo sợi (Bld)',
    Igbt: 'Khối công suất IGBT (Igbt)',
    Mod: 'Tấm pin PV Module (Mod)',
    Fuse: 'Cầu chì DC/AC (Fuse)',
    Cab: 'Cáp điện Solar DC (Cab)',
    Vl: 'Van áp lực / Van xả (Vl)',
  },
};

const INITIAL_WAREHOUSE_TREE: WarehouseNode[] = [
  {
    id: 'comp-1',
    tenantId: 'tenant-1',
    parentId: null,
    code: 'SB-HQ',
    name: 'Công ty Cổ phần Năng lượng Tái tạo DakRoSa / Sông Ba',
    assetKind: 'company',
    symbol: 'SB-HOLDING',
    condition: 'operating',
    location: 'Tòa nhà Điều hành Trung tâm Năng lượng, TP. Đà Nẵng',
    specifications: 'Tổng công suất điều hành 270MW (Hệ thống 3 nhà máy thành viên Thủy điện, Điện gió, Điện mặt trời)',
    manufacturer: 'DakRoSa Energy Corporation',
    children: [
      // =====================================================================
      // 1. NHÀ MÁY THỦY ĐIỆN SÔNG BA (HPP - 120MW)
      // =====================================================================
      {
        id: 'fact-hpp',
        tenantId: 'tenant-1',
        parentId: 'comp-1',
        code: 'SB-HPP',
        name: 'Nhà máy Thủy điện Sông Ba (HPP - 120MW)',
        assetKind: 'factory',
        symbol: 'HPP-PLANT',
        condition: 'operating',
        location: 'Khu liên hợp Thủy điện Sông Ba, Tỉnh Phú Yên',
        specifications: 'Công suất 120MW (2 Tổ máy Francis H1-H2 60MW, Cột áp 180m, Q=76 m³/s)',
        manufacturer: 'Andritz Hydro / Dongfang Electric',
        children: [
          {
            id: 'main-hpp-t1',
            tenantId: 'tenant-1',
            parentId: 'fact-hpp',
            code: 'SB-HPP-T1',
            name: 'Phân hệ Tuabin Thủy lực Francis Tổ máy H1 (Turbine Unit 1)',
            assetKind: 'main_equipment',
            symbol: 'T-H1',
            condition: 'operating',
            location: 'Nhà máy Thủy điện - Gian máy chính cao trình 12.5m',
            specifications: 'Cột áp định mức H=180m, Tốc độ 500 vòng/phút, Lưu lượng Q=38 m³/s',
            manufacturer: 'Harbin Electric Machinery',
            children: [
              {
                id: 'part-hpp-brg',
                tenantId: 'tenant-1',
                parentId: 'main-hpp-t1',
                code: 'VT-HPP-BRG-SKF6208',
                name: 'Vòng bi trục chính tuabin SKF 6208-2Z',
                assetKind: 'part',
                symbol: 'BRG-SKF',
                condition: 'operating',
                model: 'SKF 6208-2Z Explorer',
                serialNumber: 'SKF-HPP-202601',
                material: 'Thép hợp kim chịu nhiệt 100Cr6',
                dimensions: 'd=40mm, D=80mm, B=18mm',
                operatingTemp: '-20°C đến +150°C',
                pressureRating: 'Tải động C=32.5 kN',
                location: 'Kho Trung tâm Thủy điện (WH_HPP_MAIN) - Kệ Cơ khí HPP-MECH-R01-S01',
                specifications: 'Vòng bi rãnh sâu chịu tốc độ cao 12.000 v/p, nắp chặn thép 2Z mỡ bôi trơn vĩnh cửu',
                manufacturer: 'SKF (Thụy Điển)',
                requiredTools: ['Máy gia nhiệt vòng bi cảm ứng SKF TIH 030M', 'Bộ vam tháo vòng bi TMMA 80'],
                laborRequirement: '2 Kỹ sư bảo dưỡng',
                assignedTeam: 'Đội Cơ khí Thủy lực Thủy điện',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-hpp-brg',
                  itemCode: 'VT-HPP-BRG-SKF6208',
                  itemName: 'Vòng bi trục chính tuabin SKF 6208-2Z',
                  unit: 'Cái',
                  quantityOnHand: 6,
                  quantityReserved: 2,
                  quantityAvailable: 4,
                  minStock: 2,
                  maxStock: 10,
                  unitPrice: 18500000,
                  storageLocation: {
                    id: 'loc-hpp-1',
                    warehouseId: 'wh-hpp-main',
                    warehouseName: 'Tổng kho Trung tâm Thủy điện (HPP Main)',
                    zone: 'Phân khu Cơ khí',
                    shelf: 'Kệ 01',
                    bin: 'Ngăn S01',
                    fullAddress: 'Kho HPP Main - Kệ Cơ khí R01 - Tầng 1 - Ngăn S01',
                  },
                },
                transactions: [
                  {
                    id: 'tx-hpp-1',
                    transactionCode: 'NK-HPP-2026-001',
                    transactionType: 'IN',
                    itemCode: 'VT-HPP-BRG-SKF6208',
                    itemName: 'Vòng bi trục chính tuabin SKF 6208-2Z',
                    quantity: 6,
                    unit: 'Cái',
                    fromLocation: 'Nhà phân phối SKF Việt Nam',
                    toLocation: 'Kho HPP Main - Kệ R01-S01',
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: 'PO-2026-001',
                    executor: 'Lê Hữu Đạt (Thủ kho HPP)',
                    status: 'COMPLETED',
                    createdAt: '2026-08-01 08:30',
                  },
                  {
                    id: 'tx-hpp-2',
                    transactionCode: 'XK-HPP-2026-001',
                    transactionType: 'OUT',
                    itemCode: 'VT-HPP-BRG-SKF6208',
                    itemName: 'Vòng bi trục chính tuabin SKF 6208-2Z',
                    quantity: 2,
                    unit: 'Cái',
                    fromLocation: 'Kho HPP Main - Kệ R01-S01',
                    toLocation: 'Gian máy Tổ H1',
                    referenceType: 'WORK_ORDER',
                    referenceId: 'WO-2026-00142',
                    executor: 'Lê Hữu Đạt (Thủ kho HPP)',
                    status: 'COMPLETED',
                    createdAt: '2026-08-10 14:15',
                  },
                ],
                crossPlantSpareAvailable: true,
                crossPlantSuggestions: [
                  {
                    plantName: 'Tổng kho Chiến lược Công ty Mẹ',
                    warehouseName: 'WH_CENTRAL_HUB (Đà Nẵng)',
                    partCode: 'VT-HUB-BRG-SKF6208',
                    availableQty: 4,
                    matchRate: '100% Đồng bộ mã SKF',
                    statusNote: 'Dự phòng sẵn sàng chuyển trong 4h',
                  },
                ],
                children: [],
              },
              {
                id: 'part-hpp-seal',
                tenantId: 'tenant-1',
                parentId: 'main-hpp-t1',
                code: 'VT-HPP-SEAL-C4400',
                name: 'Bộ phớt làm kín nước tuabin Klingersil C-4400',
                assetKind: 'part',
                symbol: 'SEAL-C4400',
                condition: 'operating',
                model: 'Klingersil C-4400 HD',
                serialNumber: 'KLG-2026-991',
                material: 'Sợi Aramid liên kết cao su NBR chịu dầu nước cao áp',
                dimensions: 'D=450mm, dày 4mm',
                operatingTemp: '-100°C đến +400°C',
                pressureRating: 'Chịu áp lực 100 bar',
                location: 'Kho HPP Main - Kệ Cơ khí HPP-MECH-R01-S02',
                specifications: 'Tiêu chuẩn DIN 28091-2, chống lão hóa trong môi trường nước lẫn bùn cát',
                manufacturer: 'Klinger (Đức)',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-hpp-seal',
                  itemCode: 'VT-HPP-SEAL-C4400',
                  itemName: 'Bộ phớt làm kín nước tuabin Klingersil C-4400',
                  unit: 'Bộ',
                  quantityOnHand: 4,
                  quantityReserved: 1,
                  quantityAvailable: 3,
                  minStock: 2,
                  maxStock: 6,
                  unitPrice: 28000000,
                  storageLocation: {
                    id: 'loc-hpp-2',
                    warehouseId: 'wh-hpp-main',
                    warehouseName: 'Tổng kho Trung tâm Thủy điện (HPP Main)',
                    zone: 'Phân khu Cơ khí',
                    shelf: 'Kệ 01',
                    bin: 'Ngăn S02',
                    fullAddress: 'Kho HPP Main - Kệ Cơ khí R01 - Tầng 1 - Ngăn S02',
                  },
                },
                children: [],
              },
              {
                id: 'part-hpp-oil',
                tenantId: 'tenant-1',
                parentId: 'main-hpp-t1',
                code: 'VT-HPP-OIL-HYD46',
                name: 'Dầu thủy lực điều tốc Shell Tellus S2 V46 (209L)',
                assetKind: 'part',
                symbol: 'OIL-HYD46',
                condition: 'operating',
                model: 'Tellus S2 V46 Drum 209L',
                serialNumber: 'SH-TL-46-2026',
                material: 'Dầu khoáng tinh chế phụ gia chống mài mòn kẽm cao cấp',
                dimensions: 'Phuy sắt 209 Lít',
                operatingTemp: '-20°C đến +90°C',
                pressureRating: 'Độ nhớt ISO VG 46, chỉ số VI=143',
                location: 'Kho HPP Main - Khu Dầu nhớt HPP-OIL-Z01',
                specifications: 'Đáp ứng chuẩn Parker Denison HF-0/HF-1/HF-2 và Eaton E-FDGN-TB002-E',
                manufacturer: 'Shell (Hà Lan)',
                category: 'CONSUMABLE',
                stock: {
                  itemId: 'item-hpp-oil',
                  itemCode: 'VT-HPP-OIL-HYD46',
                  itemName: 'Dầu thủy lực điều tốc Shell Tellus S2 V46 (209L)',
                  unit: 'Phuy',
                  quantityOnHand: 8,
                  quantityReserved: 2,
                  quantityAvailable: 6,
                  minStock: 4,
                  maxStock: 12,
                  unitPrice: 14500000,
                  storageLocation: {
                    id: 'loc-hpp-3',
                    warehouseId: 'wh-hpp-main',
                    warehouseName: 'Tổng kho Trung tâm Thủy điện (HPP Main)',
                    zone: 'Khu Chứa Dầu',
                    shelf: 'Kệ Phuy B1',
                    bin: 'Vị trí 01-08',
                    fullAddress: 'Kho HPP Main - Khu Dầu Nhớt Z01',
                  },
                },
                children: [],
              },
            ],
          },
        ],
      },

      // =====================================================================
      // 2. NHÀ MÁY ĐIỆN GIÓ HƯỚNG LINH (WPP - 100MW)
      // =====================================================================
      {
        id: 'fact-wpp',
        tenantId: 'tenant-1',
        parentId: 'comp-1',
        code: 'SB-WPP',
        name: 'Nhà máy Điện gió Hướng Linh (WPP - 100MW)',
        assetKind: 'factory',
        symbol: 'WPP-PLANT',
        condition: 'operating',
        location: 'Khu vực Đồi gió Hướng Linh, Tỉnh Quảng Trị',
        specifications: 'Công suất 100MW (25 Tuabin Vestas V150-4.0MW, Chiều cao cột 120m, Đường kính cánh 150m)',
        manufacturer: 'Vestas Wind Systems (Đan Mạch)',
        children: [
          {
            id: 'main-wpp-wtg01',
            tenantId: 'tenant-1',
            parentId: 'fact-wpp',
            code: 'SB-WPP-WTG01',
            name: 'Cụm Tuabin Gió số 01 (Vestas V150 4.0MW)',
            assetKind: 'main_equipment',
            symbol: 'WTG-01',
            condition: 'operating',
            location: 'Vị trí trụ gió WTG-01 - Đỉnh đồi cao trình 480m',
            specifications: 'Tốc độ gió khởi động 3m/s, cắt gió 25m/s, Hộp số 3 cấp tỉ số truyền 1:120',
            manufacturer: 'Vestas Wind Systems',
            children: [
              {
                id: 'part-wpp-brg-gbx',
                tenantId: 'tenant-1',
                parentId: 'main-wpp-wtg01',
                code: 'VT-WPP-BRG-GBX',
                name: 'Vòng bi trục tốc độ cao hộp số Tuabin gió (Gearbox Bearing)',
                assetKind: 'part',
                symbol: 'BRG-GBX',
                condition: 'operating',
                model: 'FAG / SKF High-Speed Cylindrical Roller',
                serialNumber: 'FAG-WPP-88210',
                material: 'Thép hợp kim nhiệt luyện tôi cứng bề mặt Carburizing',
                dimensions: 'D=320mm, d=180mm, B=86mm',
                operatingTemp: '-30°C đến +120°C',
                pressureRating: 'Chịu tải động cực trị 450 kN',
                location: 'Kho Trung tâm Điện gió (WH_WPP_MAIN) - Kệ Nacelle WPP-NAC-R01-BIN01',
                specifications: 'Tiêu chuẩn AGMA 6006 cho hộp số tuabin gió chống rỗ vi mô Micropitting',
                manufacturer: 'FAG Schaeffler / SKF',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-wpp-brg',
                  itemCode: 'VT-WPP-BRG-GBX',
                  itemName: 'Vòng bi trục tốc độ cao hộp số Tuabin gió',
                  unit: 'Cái',
                  quantityOnHand: 3,
                  quantityReserved: 1,
                  quantityAvailable: 2,
                  minStock: 2,
                  maxStock: 5,
                  unitPrice: 95000000,
                  storageLocation: {
                    id: 'loc-wpp-1',
                    warehouseId: 'wh-wpp-main',
                    warehouseName: 'Tổng kho Trung tâm Điện gió (WPP Main)',
                    zone: 'Phân khu Nacelle',
                    shelf: 'Kệ R01',
                    bin: 'Ngăn BIN01',
                    fullAddress: 'Kho WPP Main - Kệ Nacelle R01 - Ngăn BIN01',
                  },
                },
                transactions: [
                  {
                    id: 'tx-wpp-1',
                    transactionCode: 'NK-WPP-2026-001',
                    transactionType: 'IN',
                    itemCode: 'VT-WPP-BRG-GBX',
                    itemName: 'Vòng bi trục tốc độ cao hộp số Tuabin gió',
                    quantity: 3,
                    unit: 'Cái',
                    fromLocation: 'Nhà cung ứng Schaeffler Đức',
                    toLocation: 'Kho WPP Main - Kệ R01-BIN01',
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: 'PO-2026-045',
                    executor: 'Trần Văn Hoàng (Thủ kho WPP)',
                    status: 'COMPLETED',
                    createdAt: '2026-08-05 10:00',
                  },
                ],
                children: [],
              },
              {
                id: 'part-wpp-oil-mobil',
                tenantId: 'tenant-1',
                parentId: 'main-wpp-wtg01',
                code: 'VT-WPP-OIL-MOBIL320',
                name: 'Dầu bôi trơn tổng hợp hộp số gió Mobilgear SHC XMP 320 (208L)',
                assetKind: 'part',
                symbol: 'OIL-MOBIL320',
                condition: 'operating',
                model: 'Mobilgear SHC XMP 320 Drum 208L',
                serialNumber: 'MOBIL-SHC-2026',
                material: 'Gốc Polyalphaolefin (PAO) tổng hợp cao cấp',
                dimensions: 'Phuy sắt 208 Lít',
                operatingTemp: '-35°C đến +140°C',
                pressureRating: 'Độ nhớt ISO VG 320, chỉ số VI=165',
                location: 'Kho WPP Main - Khu Dầu Nhớt Tổng hợp WPP-OIL-Z01',
                specifications: 'Đạt chứng nhận phê duyệt chính thức từ Vestas, Gamesa, GE, Hansen Transmissions',
                manufacturer: 'Mobil / ExxonMobil',
                category: 'CONSUMABLE',
                stock: {
                  itemId: 'item-wpp-oil',
                  itemCode: 'VT-WPP-OIL-MOBIL320',
                  itemName: 'Dầu bôi trơn tổng hợp hộp số gió Mobilgear SHC XMP 320',
                  unit: 'Phuy',
                  quantityOnHand: 10,
                  quantityReserved: 2,
                  quantityAvailable: 8,
                  minStock: 5,
                  maxStock: 15,
                  unitPrice: 36000000,
                  storageLocation: {
                    id: 'loc-wpp-2',
                    warehouseId: 'wh-wpp-main',
                    warehouseName: 'Tổng kho Trung tâm Điện gió (WPP Main)',
                    zone: 'Khu Dầu Nhớt Gió',
                    shelf: 'Kệ Pallet Dầu',
                    bin: 'Ô P01-10',
                    fullAddress: 'Kho WPP Main - Khu Dầu Nhớt Z01',
                  },
                },
                children: [],
              },
              {
                id: 'part-wpp-mtr-pitch',
                tenantId: 'tenant-1',
                parentId: 'main-wpp-wtg01',
                code: 'VT-WPP-MTR-PITCH',
                name: 'Động cơ xoay bước cánh tuabin Pitch Motor 400V 7.5kW',
                assetKind: 'part',
                symbol: 'MTR-PITCH',
                condition: 'operating',
                model: 'KEBA / Vestas Synchronous Servo Pitch Drive',
                serialNumber: 'PCH-MTR-2026-08',
                material: 'Vỏ nhôm tản nhiệt đúc IP65, cuộn dây đồng cấp cách điện H',
                dimensions: '350 x 280 x 620 mm, nặng 68kg',
                operatingTemp: '-25°C đến +60°C',
                pressureRating: 'Mô-men xoắn 180 Nm, Tốc độ 1500 v/p',
                location: 'Kho WPP Main - Kệ Hệ thống Pitch WPP-PCH-R02-BIN01',
                specifications: 'Tích hợp phanh điện từ an toàn và encoder quang học kép SIL-3',
                manufacturer: 'KEBA / Vestas',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-wpp-pitch',
                  itemCode: 'VT-WPP-MTR-PITCH',
                  itemName: 'Động cơ xoay bước cánh tuabin Pitch Motor 400V',
                  unit: 'Cái',
                  quantityOnHand: 2,
                  quantityReserved: 1,
                  quantityAvailable: 1,
                  minStock: 1,
                  maxStock: 4,
                  unitPrice: 125000000,
                  storageLocation: {
                    id: 'loc-wpp-3',
                    warehouseId: 'wh-wpp-main',
                    warehouseName: 'Tổng kho Trung tâm Điện gió (WPP Main)',
                    zone: 'Phân khu Pitch & Hub',
                    shelf: 'Kệ R02',
                    bin: 'Ngăn BIN01',
                    fullAddress: 'Kho WPP Main - Kệ Pitch R02 - Ngăn BIN01',
                  },
                },
                children: [],
              },
              {
                id: 'part-wpp-sen-anemo',
                tenantId: 'tenant-1',
                parentId: 'main-wpp-wtg01',
                code: 'VT-WPP-SEN-ANEMO',
                name: 'Cảm biến siêu âm đo tốc độ & hướng gió Ultrasonic Anemometer',
                assetKind: 'part',
                symbol: 'SEN-ANEMO',
                condition: 'operating',
                model: 'Thies Clima 4.3820.00.xxx 2D Ultrasonic',
                serialNumber: 'THIES-2026-554',
                material: 'Thép không gỉ 316L sơn phủ Anodized chống ăn mòn sương muối',
                dimensions: 'Cao 320mm, đường kính 210mm',
                operatingTemp: '-40°C đến +70°C',
                pressureRating: 'Dải đo gió 0 - 75 m/s, độ chính xác ±0.1 m/s',
                location: 'Kho WPP Main - Kệ Khí tượng WPP-YAW-R03-BIN01',
                specifications: 'Gia nhiệt sấy 24VDC 60W tự động chống đóng băng tuyết, giao tiếp RS485 Modbus RTU',
                manufacturer: 'Thies Clima (Đức)',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-wpp-anemo',
                  itemCode: 'VT-WPP-SEN-ANEMO',
                  itemName: 'Cảm biến siêu âm đo tốc độ & hướng gió Ultrasonic Anemometer',
                  unit: 'Cái',
                  quantityOnHand: 3,
                  quantityReserved: 0,
                  quantityAvailable: 3,
                  minStock: 2,
                  maxStock: 5,
                  unitPrice: 58000000,
                  storageLocation: {
                    id: 'loc-wpp-4',
                    warehouseId: 'wh-wpp-main',
                    warehouseName: 'Tổng kho Trung tâm Điện gió (WPP Main)',
                    zone: 'Phân khu Khí tượng Yaw',
                    shelf: 'Kệ R03',
                    bin: 'Ngăn BIN01',
                    fullAddress: 'Kho WPP Main - Kệ R03 - Ngăn BIN01',
                  },
                },
                children: [],
              },
            ],
          },
        ],
      },

      // =====================================================================
      // 3. NHÀ MÁY ĐIỆN MẶT TRỜI CHƯ NGỌC (SPP - 50MWp)
      // =====================================================================
      {
        id: 'fact-spp',
        tenantId: 'tenant-1',
        parentId: 'comp-1',
        code: 'SB-SPP',
        name: 'Nhà máy Điện mặt trời Chư Ngọc (SPP - 50MWp)',
        assetKind: 'factory',
        symbol: 'SPP-PLANT',
        condition: 'operating',
        location: 'Khu vực Nắng gió Huyện Krông Pa, Tỉnh Gia Lai',
        specifications: 'Công suất 50MWp (90.000 Tấm pin Mono Perc 550W, 16 Trạm Biến tần Trung tâm 3.125MVA)',
        manufacturer: 'Sungrow Power / Jinko Solar',
        children: [
          {
            id: 'main-spp-inv01',
            tenantId: 'tenant-1',
            parentId: 'fact-spp',
            code: 'SB-SPP-INV01',
            name: 'Trạm Biến tần Inverter Trung tâm & MBA Nâng áp Block 01 (Inverter Station 01)',
            assetKind: 'main_equipment',
            symbol: 'INV-ST01',
            condition: 'operating',
            location: 'Trung tâm Block 01 - Cánh đồng Solar Chư Ngọc',
            specifications: 'Công suất Inverter 3.125MVA 1500VDC/690VAC, MBA nâng áp 0.69/22kV 3.5MVA',
            manufacturer: 'Sungrow Power Supply',
            children: [
              {
                id: 'part-spp-pv-550w',
                tenantId: 'tenant-1',
                parentId: 'main-spp-inv01',
                code: 'VT-SPP-PV-550W',
                name: 'Tấm pin năng lượng mặt trời Mono Perc 550W Jinko Tiger Pro',
                assetKind: 'part',
                symbol: 'PV-550W',
                condition: 'operating',
                model: 'JKM550M-72HL4-BDVP Bifacial Dual Glass',
                serialNumber: 'JK-2026-PALLET-01',
                material: 'Tế bào quang điện Mono Half-cut 182mm, Kính cường lực AR 2.0mm kép',
                dimensions: '2278 × 1134 × 35 mm, Trọng lượng 32.5kg',
                operatingTemp: '-40°C đến +85°C',
                pressureRating: 'Tải trọng gió 2400 Pa, tuyết 5400 Pa, Điện áp 1500VDC',
                location: 'Kho SPP Main - Khu Pallet Tấm pin SPP-PV-Z01-RACK01',
                specifications: 'Hiệu suất quang năng 21.33%, suy giảm công suất <0.45%/năm bảo hành 30 năm',
                manufacturer: 'Jinko Solar / Longi',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-spp-pv',
                  itemCode: 'VT-SPP-PV-550W',
                  itemName: 'Tấm pin năng lượng mặt trời Mono Perc 550W Jinko Tiger Pro',
                  unit: 'Tấm',
                  quantityOnHand: 35,
                  quantityReserved: 5,
                  quantityAvailable: 30,
                  minStock: 10,
                  maxStock: 50,
                  unitPrice: 2850000,
                  storageLocation: {
                    id: 'loc-spp-1',
                    warehouseId: 'wh-spp-main',
                    warehouseName: 'Tổng kho Trung tâm Điện mặt trời (SPP Main)',
                    zone: 'Khu Lưu trữ Tấm pin',
                    shelf: 'Giá Pallet Pin A1',
                    bin: 'Vị trí P01-05',
                    fullAddress: 'Kho SPP Main - Khu Pallet SPP-PV-Z01',
                  },
                },
                transactions: [
                  {
                    id: 'tx-spp-1',
                    transactionCode: 'NK-SPP-2026-001',
                    transactionType: 'IN',
                    itemCode: 'VT-SPP-PV-550W',
                    itemName: 'Tấm pin năng lượng mặt trời Mono Perc 550W Jinko Tiger Pro',
                    quantity: 35,
                    unit: 'Tấm',
                    fromLocation: 'Nhà phân phối Jinko Solar VN',
                    toLocation: 'Kho SPP Main - Khu Pallet',
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: 'PO-2026-088',
                    executor: 'Võ Minh Trí (Thủ kho SPP)',
                    status: 'COMPLETED',
                    createdAt: '2026-08-08 09:00',
                  },
                ],
                children: [],
              },
              {
                id: 'part-spp-mc4',
                tenantId: 'tenant-1',
                parentId: 'main-spp-inv01',
                code: 'VT-SPP-MC4-CONN',
                name: 'Bộ đầu nối cáp năng lượng mặt trời MC4 Stäubli Evo2 1500V',
                assetKind: 'part',
                symbol: 'MC4-1500V',
                condition: 'operating',
                model: 'Stäubli MC4-Evo 2 PV-KBT4-EVO 2 / PV-KST4-EVO 2',
                serialNumber: 'ST-MC4-2026',
                material: 'Đồng mạ bạc chuyên dụng, vỏ nhựa Polyamide chống tia UV cấp UL94-V0',
                dimensions: 'Đường kính cáp 4-6mm²',
                operatingTemp: '-40°C đến +115°C',
                pressureRating: 'Điện áp định mức 1500VDC, Dòng 45A, Cấp bảo vệ IP68',
                location: 'Kho SPP Main - Tủ Cáp & Phụ kiện SPP-ELEC-R02-BIN01',
                specifications: 'Đạt chứng chỉ quốc tế IEC 62852 và UL 6703 chống hồ quang DC',
                manufacturer: 'Stäubli (Thụy Sĩ)',
                category: 'CONSUMABLE',
                stock: {
                  itemId: 'item-spp-mc4',
                  itemCode: 'VT-SPP-MC4-CONN',
                  itemName: 'Bộ đầu nối cáp năng lượng mặt trời MC4 Stäubli 1500V',
                  unit: 'Cặp',
                  quantityOnHand: 320,
                  quantityReserved: 50,
                  quantityAvailable: 270,
                  minStock: 100,
                  maxStock: 500,
                  unitPrice: 45000,
                  storageLocation: {
                    id: 'loc-spp-2',
                    warehouseId: 'wh-spp-main',
                    warehouseName: 'Tổng kho Trung tâm Điện mặt trời (SPP Main)',
                    zone: 'Phân khu Đầu nối Cáp',
                    shelf: 'Kệ Điện R02',
                    bin: 'Hộp BIN01',
                    fullAddress: 'Kho SPP Main - Kệ R02 - Hộp BIN01',
                  },
                },
                children: [],
              },
              {
                id: 'part-spp-fuse',
                tenantId: 'tenant-1',
                parentId: 'main-spp-inv01',
                code: 'VT-SPP-FUSE-DC1500',
                name: 'Cầu chì DC chuyên dụng Solar gPV 1500VDC 20A Bussmann',
                assetKind: 'part',
                symbol: 'FUSE-DC1500',
                condition: 'operating',
                model: 'Eaton Bussmann PV-20A10F-1500',
                serialNumber: 'BSM-PV-2026',
                material: 'Vỏ sứ gốm cao cấp chịu nhiệt cao, tiếp điểm đồng mạ bạc',
                dimensions: 'Kích thước 10 × 85 mm',
                operatingTemp: '-40°C đến +90°C',
                pressureRating: 'Điện áp 1500VDC, Dòng 20A, Dòng cắt ngắn mạch 50kA',
                location: 'Kho SPP Main - Tủ Cầu chì SPP-ELEC-R02-BIN01',
                specifications: 'Tiêu chuẩn bảo vệ chuỗi quang điện IEC 60269-6 gPV',
                manufacturer: 'Eaton Bussmann (Mỹ)',
                category: 'CONSUMABLE',
                stock: {
                  itemId: 'item-spp-fuse',
                  itemCode: 'VT-SPP-FUSE-DC1500',
                  itemName: 'Cầu chì DC chuyên dụng Solar gPV 1500VDC 20A Bussmann',
                  unit: 'Cái',
                  quantityOnHand: 65,
                  quantityReserved: 10,
                  quantityAvailable: 55,
                  minStock: 30,
                  maxStock: 100,
                  unitPrice: 185000,
                  storageLocation: {
                    id: 'loc-spp-3',
                    warehouseId: 'wh-spp-main',
                    warehouseName: 'Tổng kho Trung tâm Điện mặt trời (SPP Main)',
                    zone: 'Phân khu Tủ điện DC',
                    shelf: 'Kệ R02',
                    bin: 'Hộp BIN02',
                    fullAddress: 'Kho SPP Main - Kệ R02 - Hộp BIN02',
                  },
                },
                children: [],
              },
              {
                id: 'part-spp-igbt',
                tenantId: 'tenant-1',
                parentId: 'main-spp-inv01',
                code: 'VT-SPP-IGBT-MOD',
                name: 'Khối Module công suất IGBT Biến tần Inverter Sungrow SG250HX',
                assetKind: 'part',
                symbol: 'IGBT-MOD',
                condition: 'operating',
                model: 'Infineon PrimePACK 3 FF600R17ME4_B11',
                serialNumber: 'INF-IGBT-2026-901',
                material: 'Bán dẫn Silicon Si-IGBT công nghệ Trench/Fieldstop 4',
                dimensions: '172 × 89 × 38 mm',
                operatingTemp: '-40°C đến +150°C',
                pressureRating: 'Điện áp cực đại Vces=1700V, Dòng Ic=600A',
                location: 'Kho SPP Main - Kệ Module Inverter SPP-INV-R01-BIN01',
                specifications: 'Tích hợp cảm biến nhiệt độ NTC chính xác bảo vệ quá tải nhiệt biến tần Solar',
                manufacturer: 'Infineon Technologies / Sungrow',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-spp-igbt',
                  itemCode: 'VT-SPP-IGBT-MOD',
                  itemName: 'Khối Module công suất IGBT Biến tần Inverter',
                  unit: 'Cái',
                  quantityOnHand: 4,
                  quantityReserved: 1,
                  quantityAvailable: 3,
                  minStock: 2,
                  maxStock: 8,
                  unitPrice: 42000000,
                  storageLocation: {
                    id: 'loc-spp-4',
                    warehouseId: 'wh-spp-main',
                    warehouseName: 'Tổng kho Trung tâm Điện mặt trời (SPP Main)',
                    zone: 'Phân khu Inverter Module',
                    shelf: 'Kệ Inverter R01',
                    bin: 'Ngăn BIN01',
                    fullAddress: 'Kho SPP Main - Kệ Inverter R01 - Ngăn BIN01',
                  },
                },
                children: [],
              },
            ],
          },
        ],
      },

      // =====================================================================
      // 4. TỔNG KHO CHIẾN LƯỢC CÔNG TY MẸ (CENTRAL STRATEGIC HUB)
      // =====================================================================
      {
        id: 'fact-hub',
        tenantId: 'tenant-1',
        parentId: 'comp-1',
        code: 'SB-HUB',
        name: 'Tổng kho Chiến lược Công ty Mẹ (Central Strategic Hub)',
        assetKind: 'factory',
        symbol: 'CENTRAL-HUB',
        condition: 'operating',
        location: 'Khu công nghiệp Hòa Cầm, TP. Đà Nẵng',
        specifications: 'Tổng diện tích kho 5.000m² lưu trữ phụ tùng chiến lược giá trị cao và dự phòng dùng chung cho 3 nhà máy',
        manufacturer: 'DakRoSa Holding Logistics',
        children: [
          {
            id: 'main-hub-trf',
            tenantId: 'tenant-1',
            parentId: 'fact-hub',
            code: 'SB-HUB-TRF',
            name: 'Phân hệ Thiết bị Chiến lược Trạm 110kV & Điều độ Trung tâm',
            assetKind: 'main_equipment',
            symbol: 'TRF-110KV',
            condition: 'operating',
            location: 'Nhà kho thiết bị cao thế Heavy Spares Hub',
            specifications: 'Máy biến áp 63MVA, Máy cắt SF6 110kV, Rơ-le bảo vệ kỹ thuật số SEL',
            manufacturer: 'Thibidi / ABB / SEL',
            children: [
              {
                id: 'part-hub-trf-110',
                tenantId: 'tenant-1',
                parentId: 'main-hub-trf',
                code: 'VT-HUB-TRF-110KV',
                name: 'Máy biến áp tăng áp chính 110/22kV 63MVA ngâm dầu Thibidi',
                assetKind: 'part',
                symbol: 'TRF-63MVA',
                condition: 'operating',
                model: 'Thibidi Power Transformer 63MVA 115±9x1.78%/23kV',
                serialNumber: 'THIBIDI-2026-63MVA',
                material: 'Lõi thép tôn silic định hướng từ tính cao, cuộn dây đồng OFC 99.99%',
                dimensions: '6800 × 4200 × 5100 mm, Tổng trọng lượng 78 tấn',
                operatingTemp: '-10°C đến +105°C',
                pressureRating: 'Điện áp 110kV/22kV, Công suất 63.000 kVA ngâm dầu ONAN/ONAF',
                location: 'Tổng kho Chiến lược (WH_CENTRAL_HUB) - Khu Máy biến áp HUB-STRAT-A1-BIN01',
                specifications: 'Bộ điều áp dưới tải OLTC Reinhausen Đức, bảo vệ Buchholz và rơ-le áp lực đột biến',
                manufacturer: 'Thibidi / ABB',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-hub-trf',
                  itemCode: 'VT-HUB-TRF-110KV',
                  itemName: 'Máy biến áp tăng áp chính 110/22kV 63MVA Thibidi',
                  unit: 'Máy',
                  quantityOnHand: 2,
                  quantityReserved: 0,
                  quantityAvailable: 2,
                  minStock: 1,
                  maxStock: 2,
                  unitPrice: 18500000000,
                  storageLocation: {
                    id: 'loc-hub-1',
                    warehouseId: 'wh-central-hub',
                    warehouseName: 'Tổng kho Chiến lược Công ty Mẹ',
                    zone: 'Khu Siêu trọng A1',
                    shelf: 'Bệ máy B01',
                    bin: 'Vị trí B01-02',
                    fullAddress: 'Kho Central Hub - Khu A1 - Bệ máy 01',
                  },
                },
                transactions: [
                  {
                    id: 'tx-hub-1',
                    transactionCode: 'NK-HUB-2026-001',
                    transactionType: 'IN',
                    itemCode: 'VT-HUB-TRF-110KV',
                    itemName: 'Máy biến áp chính 110/22kV 63MVA Thibidi',
                    quantity: 2,
                    unit: 'Máy',
                    fromLocation: 'Nhà máy Sản xuất Thibidi Đồng Nai',
                    toLocation: 'Tổng kho Central Hub Đà Nẵng',
                    referenceType: 'PURCHASE_ORDER',
                    referenceId: 'PO-STRAT-2026-001',
                    executor: 'Trần Đình Trọng (Tổng Giám đốc / Trưởng kho Hub)',
                    status: 'COMPLETED',
                    createdAt: '2026-07-20 15:30',
                  },
                ],
                children: [],
              },
              {
                id: 'part-hub-cb-sf6',
                tenantId: 'tenant-1',
                parentId: 'main-hub-trf',
                code: 'VT-HUB-CB-SF6',
                name: 'Máy cắt khí SF6 110kV ngoài trời ABB LTB 145D1',
                assetKind: 'part',
                symbol: 'CB-SF6-110',
                condition: 'operating',
                model: 'ABB LTB 145D1/B Live Tank Circuit Breaker',
                serialNumber: 'ABB-LTB-2026-114',
                material: 'Trụ sứ cách điện chất lượng cao, khí dập hồ quang SF6 tinh khiết',
                dimensions: '3850 × 1200 × 4200 mm',
                operatingTemp: '-40°C đến +50°C',
                pressureRating: 'Điện áp định mức 145kV, Dòng 3150A, Dòng cắt ngắn mạch 40kA/3s',
                location: 'Tổng kho Chiến lược (WH_CENTRAL_HUB) - Kệ Thiết bị HUB-STRAT-A1-BIN01',
                specifications: 'Cơ cấu truyền động lò xo FSA1 độ tin cậy cơ khí 10.000 chu kỳ đóng cắt',
                manufacturer: 'ABB (Thụy Sĩ)',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-hub-cb',
                  itemCode: 'VT-HUB-CB-SF6',
                  itemName: 'Máy cắt khí SF6 110kV ngoài trời ABB LTB 145D1',
                  unit: 'Bộ',
                  quantityOnHand: 2,
                  quantityReserved: 0,
                  quantityAvailable: 2,
                  minStock: 1,
                  maxStock: 2,
                  unitPrice: 950000000,
                  storageLocation: {
                    id: 'loc-hub-2',
                    warehouseId: 'wh-central-hub',
                    warehouseName: 'Tổng kho Chiến lược Công ty Mẹ',
                    zone: 'Khu Thiết bị Cao thế',
                    shelf: 'Kệ A1',
                    bin: 'Ngăn BIN01',
                    fullAddress: 'Kho Central Hub - Kệ A1 - Ngăn BIN01',
                  },
                },
                children: [],
              },
              {
                id: 'part-hub-rly-prot',
                tenantId: 'tenant-1',
                parentId: 'main-hub-trf',
                code: 'VT-HUB-RLY-PROT',
                name: 'Rơ-le kỹ thuật số bảo vệ so lệch MBA & Đường dây SEL-487E',
                assetKind: 'part',
                symbol: 'SEL-487E',
                condition: 'operating',
                model: 'SEL-487E-4 Transformer Differential and Voltage Relay',
                serialNumber: 'SEL-2026-88741',
                material: 'Khung vỏ kim loại chuẩn Rack 19 inch 4U chống nhiễu EMC chuẩn công nghiệp điện lực',
                dimensions: '482 × 177 × 280 mm',
                operatingTemp: '-40°C đến +85°C',
                pressureRating: 'Nguồn nuôi 110/220VDC/VAC, Đầu vào dòng 1A/5A',
                location: 'Tổng kho Chiến lược (WH_CENTRAL_HUB) - Kệ Rơ-le HUB-STRAT-A2-BIN01',
                specifications: 'Hỗ trợ giao thức truyền thông IEC 61850 Edition 2, GOOSE, Synchrophasor IEEE C37.118',
                manufacturer: 'Schweitzer Engineering Laboratories (Mỹ)',
                category: 'SPARE_PART',
                stock: {
                  itemId: 'item-hub-rly',
                  itemCode: 'VT-HUB-RLY-PROT',
                  itemName: 'Rơ-le kỹ thuật số bảo vệ so lệch SEL-487E',
                  unit: 'Cái',
                  quantityOnHand: 4,
                  quantityReserved: 1,
                  quantityAvailable: 3,
                  minStock: 2,
                  maxStock: 4,
                  unitPrice: 320000000,
                  storageLocation: {
                    id: 'loc-hub-3',
                    warehouseId: 'wh-central-hub',
                    warehouseName: 'Tổng kho Chiến lược Công ty Mẹ',
                    zone: 'Phân khu Rơ-le & Tự động hóa',
                    shelf: 'Kệ A2',
                    bin: 'Ngăn BIN01',
                    fullAddress: 'Kho Central Hub - Kệ A2 - Ngăn BIN01',
                  },
                },
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

class WarehouseService {
  private tree: WarehouseNode[] = INITIAL_WAREHOUSE_TREE;
  private dictionary: NamingDictionary = DEFAULT_NAMING_DICTIONARY;

  async getTree(): Promise<WarehouseNode[]> {
    return JSON.parse(JSON.stringify(this.tree));
  }

  async getDictionary(): Promise<NamingDictionary> {
    return JSON.parse(JSON.stringify(this.dictionary));
  }

  async saveDictionary(dict: NamingDictionary): Promise<NamingDictionary> {
    this.dictionary = { ...dict };
    return this.dictionary;
  }

  async addNode(newNode: Omit<WarehouseNode, 'id' | 'children'>): Promise<WarehouseNode> {
    const node: WarehouseNode = {
      ...newNode,
      id: `node-${Date.now()}`,
      children: [],
    };

    if (!node.parentId) {
      this.tree.push(node);
      return node;
    }

    const insertChild = (nodes: WarehouseNode[]): boolean => {
      for (const parent of nodes) {
        if (parent.id === node.parentId) {
          parent.children = parent.children || [];
          parent.children.push(node);
          return true;
        }
        if (parent.children && insertChild(parent.children)) {
          return true;
        }
      }
      return false;
    };

    insertChild(this.tree);
    return node;
  }

  async updateNode(id: string, updateData: Partial<WarehouseNode>): Promise<WarehouseNode | null> {
    const findAndUpdate = (nodes: WarehouseNode[]): WarehouseNode | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          nodes[i] = { ...nodes[i], ...updateData };
          return nodes[i];
        }
        if (nodes[i].children) {
          const res = findAndUpdate(nodes[i].children);
          if (res) return res;
        }
      }
      return null;
    };

    return findAndUpdate(this.tree);
  }

  async deleteNode(id: string): Promise<boolean> {
    const findAndDelete = (nodes: WarehouseNode[]): boolean => {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx >= 0) {
        nodes.splice(idx, 1);
        return true;
      }
      for (const node of nodes) {
        if (node.children && findAndDelete(node.children)) {
          return true;
        }
      }
      return false;
    };

    return findAndDelete(this.tree);
  }

  /**
   * Thêm giao dịch kho mới (Transaction-Driven theo plan_2.md & dexuat.md)
   * và tự động cập nhật số dư tồn kho On-Hand / Reserved / Available
   */
  async addTransaction(
    nodeId: string,
    transaction: Omit<InventoryTransaction, 'id' | 'createdAt'>
  ): Promise<InventoryTransaction> {
    const newTx: InventoryTransaction = {
      ...transaction,
      id: `tx-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    const node = await this.findNodeById(nodeId);
    if (node) {
      node.transactions = node.transactions || [];
      node.transactions.unshift(newTx);

      // Cập nhật số dư kho nếu có stock
      if (node.stock) {
        if (newTx.transactionType === 'IN' || newTx.transactionType === 'RETURN') {
          node.stock.quantityOnHand += newTx.quantity;
        } else if (newTx.transactionType === 'OUT' || newTx.transactionType === 'BORROW') {
          node.stock.quantityOnHand = Math.max(0, node.stock.quantityOnHand - newTx.quantity);
          if (newTx.referenceType === 'WORK_ORDER' && node.stock.quantityReserved > 0) {
            node.stock.quantityReserved = Math.max(0, node.stock.quantityReserved - newTx.quantity);
          }
        }
        node.stock.quantityAvailable = Math.max(
          0,
          node.stock.quantityOnHand - node.stock.quantityReserved
        );
      }

      // Thêm vào timeline
      node.timeline = node.timeline || [];
      node.timeline.unshift({
        date: new Date().toLocaleDateString('vi-VN'),
        event: `Giao dịch ${newTx.transactionType}: ${newTx.transactionCode} (${newTx.quantity} ${newTx.unit}) - ${newTx.notes || ''}`,
        type: newTx.transactionType === 'IN' ? 'inspection' : 'maintenance',
        reference: newTx.referenceId,
      });

      await this.updateNode(nodeId, node);
    }

    return newTx;
  }

  /**
   * Giữ chỗ vật tư cho Work Order (Reservation mechanism theo plan_2.md)
   */
  async reserveMaterial(nodeId: string, qty: number, workOrderId: string): Promise<boolean> {
    const node = await this.findNodeById(nodeId);
    if (!node || !node.stock) return false;

    if (node.stock.quantityAvailable < qty) {
      throw new Error(`Tồn kho khả dụng không đủ để giữ chỗ (Còn: ${node.stock.quantityAvailable}, Yêu cầu: ${qty})`);
    }

    node.stock.quantityReserved += qty;
    node.stock.quantityAvailable = node.stock.quantityOnHand - node.stock.quantityReserved;

    node.timeline = node.timeline || [];
    node.timeline.unshift({
      date: new Date().toLocaleDateString('vi-VN'),
      event: `Giữ chỗ ${qty} ${node.stock.unit} cho Lệnh bảo trì ${workOrderId}`,
      type: 'maintenance',
      reference: workOrderId,
    });

    await this.updateNode(nodeId, node);
    return true;
  }

  async findNodeById(id: string): Promise<WarehouseNode | null> {
    const walk = (nodes: WarehouseNode[]): WarehouseNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children?.length) {
          const res = walk(n.children);
          if (res) return res;
        }
      }
      return null;
    };
    return walk(this.tree);
  }

  generateCode(params: {
    companyCode: string;
    factoryCode: string;
    mainPartCode: string;
    subPartCodes: string[];
    sequenceNumber: string;
  }): string {
    const parts = [
      params.companyCode,
      params.factoryCode,
      params.mainPartCode,
      ...params.subPartCodes.filter(Boolean),
      params.sequenceNumber.padStart(2, '0'),
    ];
    return parts.filter(Boolean).join('-');
  }
}

export const warehouseService = new WarehouseService();
