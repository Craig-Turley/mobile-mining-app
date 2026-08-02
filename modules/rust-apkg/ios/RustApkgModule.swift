import ExpoModulesCore

public class RustApkgModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RustApkg")

    Function("hello") {
      return "Hello world! 👋"
    }

    AsyncFunction("rustAdd") { (a: Int32, b:Int32) -> Int32 in
        return rust_add(a, b)
    }
  }
}
