require 'xcodeproj'

project_path = 'ios/PrepAssist.xcodeproj'
project = Xcodeproj::Project.open(project_path)

project.targets.each do |target|
  target.build_configurations.each do |config|
    config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
  end
end

project.save
puts "Successfully disabled User Script Sandboxing in PrepAssist.xcodeproj!"
