import java.io.File;
import java.lang.reflect.Field;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;

import javafx.scene.control.CheckBox;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Control;
import javafx.scene.image.ImageView;
import javafx.application.Platform;
import javafx.scene.control.ListView;
import javafx.scene.control.MenuItem;
import javafx.scene.control.Tab;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.ToggleButton;
import javafx.scene.layout.AnchorPane;
import javafx.scene.layout.VBox;
import javafx.util.Pair;

import org.ruru.ffta2editor.*;
import org.ruru.ffta2editor.utility.Archive;
import org.ruru.ffta2editor.utility.AutoCompleteComboBox;
import org.ruru.ffta2editor.utility.IdxAndPak;
import org.ruru.ffta2editor.utility.LZSS;

/**
 * Independent acceptance oracle. Loads the prepared (clamped) ROM payload with
 * the original Java controllers, applies the same deterministic basic edit as
 * the TS acceptance test, runs the complete save order plus container repack,
 * and writes the persistent payload the TS writer is compared against.
 *
 * Run:
 *   javac -cp "target/classes:<javafx jars>" -d target/oracle tools/oracle/AcceptanceOracle.java
 *   java  -cp "target/oracle:target/classes:<javafx jars>" AcceptanceOracle data/extracted/files data/compare
 */
public class AcceptanceOracle {
    static final String[][] PAKS = {
        {"sysdata", "system/rom/sysdata_rom.idx", "system/rom/sysdata.pak"},
        {"unitSsts", "char/rom/rom_idx/UnitSst.rom_idx", "char/rom/pak/UnitSst.pak"},
        {"unitCgs", "char/rom/rom_idx/UnitCg.rom_idx", "char/rom/pak/UnitCg.pak"},
        {"jdMessage", "system/rom/JD_message_rom_0.idx", "system/rom/JD_message_0.pak"},
        {"jhQuest", "system/rom/JH_questtext_rom_0.idx", "system/rom/JH_questtext_0.pak"},
        {"jhRumor", "system/rom/JH_uwasatext_rom_0.idx", "system/rom/JH_uwasatext_0.pak"},
        {"jhNotice", "system/rom/JH_freepapermes_rom_0.idx", "system/rom/JH_freepapermes_0.pak"},
        {"evMsg", "event/rom/ev_msg0_rom.idx", "event/rom/ev_msg0.pak"},
        {"entrydata", "system/rom/entrydata_rom.idx", "system/rom/entrydata.pak"},
        {"atl", "menu/atl_rom/atl_rom.idx", "menu/atl_rom/atl.pak"},
        {"face", "menu/face_rom/face_rom.idx", "menu/face_rom/face.pak"},
        {"mapData", "map/rom/MapData.idx", "map/rom/MapData.dat"},
        {"texData", "map/rom/TexData.idx", "map/rom/TexData.dat"},
        {"plttData", "map/rom/PlttData.idx", "map/rom/PlttData.dat"},
    };

    static ByteBuffer read(Path p) throws Exception {
        return ByteBuffer.wrap(Files.readAllBytes(p)).order(ByteOrder.LITTLE_ENDIAN);
    }

    static byte[] bytes(ByteBuffer b) {
        ByteBuffer d = b.duplicate();
        d.rewind();
        byte[] out = new byte[d.remaining()];
        d.get(out);
        return out;
    }

    static void write(Path dir, String name, byte[] data) throws Exception {
        Files.write(dir.resolve(name), data);
    }

    static Object control(Class<?> type) throws Exception {
        if (type == AutoCompleteComboBox.class) return new AutoCompleteComboBox<>();
        if (type == ComboBox.class) return new ComboBox<>();
        if (type == ListView.class) return new ListView<>();
        if (type == TextField.class) return new TextField();
        if (type == TextArea.class) return new TextArea();
        if (type == CheckBox.class) return new CheckBox();
        if (type == ToggleButton.class) return new ToggleButton();
        if (type == ImageView.class) return new ImageView();
        if (type == Tab.class) return new Tab();
        if (type == VBox.class) return new VBox();
        if (type == AnchorPane.class) return new AnchorPane();
        if (type == MenuItem.class) return new MenuItem();
        if (Control.class.isAssignableFrom(type)) {
            return type.getDeclaredConstructor().newInstance();
        }
        return null;
    }

    static void injectFxml(Object controller) throws Exception {
        for (Field f : controller.getClass().getDeclaredFields()) {
            if (f.getAnnotation(javafx.fxml.FXML.class) == null) continue;
            f.setAccessible(true);
            if (f.get(controller) != null) continue;
            Object value = control(f.getType());
            if (value != null) f.set(controller, value);
        }
    }

    static void call(Object target, String method) throws Exception {
        target.getClass().getMethod(method).invoke(target);
    }

    @SuppressWarnings("unchecked")
    static void plusOne(Object obj, String field, Class<?> numberType) throws Exception {
        Field f = obj.getClass().getField(field);
        f.setAccessible(true);
        Object prop = f.get(obj);
        Object old = prop.getClass().getMethod("getValue").invoke(prop);
        Object value;
        if (numberType == Byte.class) value = (byte) (((Number) old).intValue() + 1);
        else if (numberType == Short.class) value = (short) (((Number) old).intValue() + 1);
        else value = ((Number) old).intValue() + 1;
        prop.getClass().getMethod("setValue", Object.class).invoke(prop, value);
    }

    public static void main(String[] args) throws Exception {
        Platform.startup(() -> {});
        Path filesDir = Path.of(args[0]);
        Path outDir = Path.of(args[1]);
        Files.createDirectories(outDir);

        App.loadWarningList.clear();
        App.archive = new Archive(
            filesDir.resolve("master/pc.idx").toFile(),
            filesDir.resolve("master/pc.bin").toFile());
        App.arm9 = read(filesDir.resolve("arm9.bin"));
        App.overlay11 = read(filesDir.resolve("overlay_0011.bin"));
        App.overlay8 = read(filesDir.resolve("overlay_0008.bin"));

        for (String[] p : PAKS) {
            ByteBuffer idx = App.archive.getFile(p[1]);
            ByteBuffer pak = App.archive.getFile(p[2]);
            if (idx == null || pak == null) throw new IllegalStateException("Missing " + p[0]);
            IdxAndPak value = new IdxAndPak(p[0], idx, pak);
            switch (p[0]) {
                case "sysdata": App.sysdata = value; break;
                case "unitSsts": App.unitSsts = value; break;
                case "unitCgs": App.unitCgs = value; break;
                case "jdMessage": App.jdMessage = value; break;
                case "jhQuest": App.jhQuest = value; break;
                case "jhRumor": App.jhRumor = value; break;
                case "jhNotice": App.jhNotice = value; break;
                case "evMsg": App.evMsg = value; break;
                case "entrydata": App.entrydata = value; break;
                case "atl": App.atl = value; break;
                case "face": App.face = value; break;
                case "mapData": App.mapData = value; break;
                case "texData": App.texData = value; break;
                case "plttData": App.plttData = value; break;
                default: break;
            }
        }

        ByteBuffer animTable = App.archive.getFile("char/NaUnitAnimTable.bin");
        if (animTable == null) throw new IllegalStateException("Missing NaUnitAnimTable");
        App.naUnitAnimTable = LZSS.decode(animTable.position(4)).decodedData;

        PatchesController patches = new PatchesController();
        TextController text = new TextController();
        AbilityController ability = new AbilityController();
        SpritesController sprites = new SpritesController();
        JobController jobs = new JobController();
        CharacterController characters = new CharacterController();
        JobGroupController jobGroups = new JobGroupController();
        JobRequirementController jobRequirements = new JobRequirementController();
        EquipmentController equipment = new EquipmentController();
        ConsumableController consumables = new ConsumableController();
        LootController loot = new LootController();
        ItemTableController itemTables = new ItemTableController();
        LawBonusController lawBonuses = new LawBonusController();
        FormationController formations = new FormationController();
        QuestController quests = new QuestController();
        BazaarController bazaar = new BazaarController();
        AuctionController auctions = new AuctionController();

        for (Object c : new Object[] { patches, text, ability, sprites, jobs, characters, jobGroups,
                jobRequirements, equipment, consumables, loot, itemTables, lawBonuses, formations,
                quests, bazaar, auctions }) {
            injectFxml(c);
        }

        call(patches, "loadPatches");
        call(text, "loadMessages");
        call(ability, "loadAbilities");
        call(sprites, "loadSprites");
        call(jobs, "loadJobs");
        call(characters, "loadCharacters");
        call(jobGroups, "loadJobGroups");
        call(jobRequirements, "loadJobRequirements");
        call(equipment, "loadEquipment");
        call(consumables, "loadConsumables");
        call(loot, "loadLoot");
        call(itemTables, "loadItemTables");
        call(lawBonuses, "loadLawBonus");
        call(formations, "loadFormations");
        call(quests, "loadQuests");
        call(bazaar, "loadBazaar");
        call(auctions, "loadAuctions");

        // Mirrors test/acceptance.test.ts applyBasicMod().
        plusOne(App.jobDataList.get(1), "move", Byte.class);
        plusOne(App.jobDataList.get(1), "jump", Byte.class);
        plusOne(App.activeAbilityList.get(1), "mpCost", Byte.class);
        plusOne(App.activeAbilityList.get(1), "power", Short.class);
        plusOne(App.equipmentList.get(1), "buy", Short.class);
        plusOne(App.equipmentList.get(1), "attack", Byte.class);

        call(text, "saveMessages");
        call(ability, "saveAbilities");
        call(jobs, "saveJobs");
        call(sprites, "saveSprites");
        call(characters, "saveCharacters");
        call(jobGroups, "saveJobGroups");
        call(jobRequirements, "saveJobRequirements");
        call(equipment, "saveEquipment");
        call(consumables, "saveConsumables");
        call(loot, "saveLoot");
        call(itemTables, "saveItemTables");
        call(lawBonuses, "saveLawBonus");
        call(formations, "saveFormations");
        call(quests, "saveQuests");
        call(bazaar, "saveBazaar");
        call(auctions, "saveAuctions");

        for (String[] p : PAKS) {
            IdxAndPak pak = switch (p[0]) {
                case "sysdata" -> App.sysdata;
                case "unitSsts" -> App.unitSsts;
                case "unitCgs" -> App.unitCgs;
                case "jdMessage" -> App.jdMessage;
                case "jhQuest" -> App.jhQuest;
                case "jhRumor" -> App.jhRumor;
                case "jhNotice" -> App.jhNotice;
                case "evMsg" -> App.evMsg;
                case "entrydata" -> App.entrydata;
                case "atl" -> App.atl;
                case "face" -> App.face;
                case "mapData" -> App.mapData;
                case "texData" -> App.texData;
                case "plttData" -> App.plttData;
                default -> null;
            };
            Pair<ByteBuffer, ByteBuffer> repacked = pak.repack();
            App.archive.setFile(p[1], repacked.getKey());
            App.archive.setFile(p[2], repacked.getValue());
        }

        ByteBuffer encoded = LZSS.encode(App.naUnitAnimTable.rewind());
        int padding = encoded.capacity() % 4 != 0 ? 4 - (encoded.capacity() % 4) : 0;
        ByteBuffer newTable = ByteBuffer.allocate(encoded.capacity() + 4 + padding);
        newTable.putInt(encoded.getShort(1));
        newTable.put(encoded);
        App.archive.setFile("char/NaUnitAnimTable.bin", newTable);

        Pair<ByteBuffer, ByteBuffer> pc = App.archive.repack();
        write(outDir, "oracle_acc_pc.idx", bytes(pc.getKey()));
        write(outDir, "oracle_acc_pc.bin", bytes(pc.getValue()));
        write(outDir, "oracle_acc_arm9.bin", bytes(App.arm9));
        write(outDir, "oracle_acc_overlay11.bin", bytes(App.overlay11));
        System.out.println("wrote oracle_acc_{pc.idx,pc.bin,arm9.bin,overlay11.bin}");
    }
}
