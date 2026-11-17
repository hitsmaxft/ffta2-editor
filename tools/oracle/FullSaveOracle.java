import java.io.File;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;

import javafx.util.Pair;

import org.ruru.ffta2editor.utility.Archive;
import org.ruru.ffta2editor.utility.IdxAndPak;
import org.ruru.ffta2editor.utility.LZSS;

/**
 * Independent oracle for the ROM container save path implemented by
 * MainController.save: repack all 14 IdxAndPaks (unmodified), re-encode
 * NaUnitAnimTable, then repack the master archive.
 *
 * Run:
 *   java -cp "target/classes:target/deps/*" tools/oracle/FullSaveOracle.java <extractedFilesDir> <outDir>
 * (Java single-file source mode requires the target classes on the classpath.)
 */
public class FullSaveOracle {
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

    static byte[] bytes(ByteBuffer b) {
        ByteBuffer d = b.duplicate();
        d.rewind();
        byte[] out = new byte[d.remaining()];
        d.get(out);
        return out;
    }

    public static void main(String[] args) throws Exception {
        Path filesDir = Path.of(args[0]);
        Path outDir = Path.of(args[1]);
        Files.createDirectories(outDir);

        Archive archive = new Archive(
            filesDir.resolve("master/pc.idx").toFile(),
            filesDir.resolve("master/pc.bin").toFile());

        for (String[] p : PAKS) {
            ByteBuffer idx = archive.getFile(p[1]);
            ByteBuffer pak = archive.getFile(p[2]);
            if (idx == null || pak == null) throw new IllegalStateException("Missing " + p[0]);
            IdxAndPak original = new IdxAndPak(p[0], idx, pak);
            Pair<ByteBuffer, ByteBuffer> repacked = original.repack();
            archive.setFile(p[1], repacked.getKey());
            archive.setFile(p[2], repacked.getValue());
        }

        ByteBuffer animTable = archive.getFile("char/NaUnitAnimTable.bin");
        if (animTable == null) throw new IllegalStateException("Missing NaUnitAnimTable");
        animTable.position(4);
        ByteBuffer decoded = LZSS.decode(animTable).decodedData;
        ByteBuffer encoded = LZSS.encode(decoded.rewind());
        int padding = encoded.capacity() % 4 != 0 ? 4 - (encoded.capacity() % 4) : 0;
        ByteBuffer newTable = ByteBuffer.allocate(encoded.capacity() + 4 + padding);
        newTable.putInt(encoded.getShort(1));
        newTable.put(encoded);
        archive.setFile("char/NaUnitAnimTable.bin", newTable);

        Pair<ByteBuffer, ByteBuffer> pc = archive.repack();
        Files.write(outDir.resolve("oracle_full_pc.idx"), bytes(pc.getKey()));
        Files.write(outDir.resolve("oracle_full_pc.bin"), bytes(pc.getValue()));
        System.out.println("wrote oracle_full_pc.{idx,bin}");
    }
}
